import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Edit2, Search, Filter, BookOpen, Upload, Loader2, X } from "lucide-react";

import { useState } from "react";
import { toast } from "sonner";
import { uploadToImageKit } from "@/lib/imagekit";

export const Route = createFileRoute("/admin/courses")({
  component: CoursesAdmin,
});

function CoursesAdmin() {
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    details: "",
    price: "0",
    discount_price: "0",
    category: "",
    thumbnail_url: "",
    is_published: true
  });

  const handleCourseSubmit = async () => {
    try {
      console.log("[CourseSubmit] Form values:", formData);
      console.log("[CourseSubmit] Selected file:", selectedFile);
      
      toast.info("Processing...", { duration: 2000 });
      
      if (isSubmitting) {
        console.warn("[CourseSubmit] Submission already in progress, skipping.");
        return;
      }

      const loadingToast = toast.loading(editingCourse ? "Updating course..." : "Creating course...");
      setIsSubmitting(true);

      console.log("[CourseSubmit] Starting submission flow...");
      
      // 1. Check Auth Session
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      if (authError) throw new Error(`Authentication Lookup Failed: ${authError.message}`);
      if (!session) throw new Error("Authentication session missing. Please log in again.");
      
      console.log("[CourseSubmit] User:", session.user.email);

      // 2. Validation
      if (!formData.title?.trim()) {
        throw new Error("Course title is required");
      }
      if (!formData.category) {
        throw new Error("Please select a category");
      }
      
      // Validate prices as numbers
      const price = parseFloat(formData.price);
      const discountPrice = formData.discount_price ? parseFloat(formData.discount_price) : null;
      
      if (isNaN(price)) {
        throw new Error("Original Price must be a valid number");
      }
      if (formData.discount_price && isNaN(discountPrice as number)) {
        throw new Error("Discount Price must be a valid number or empty");
      }

      let currentThumbnailUrl = formData.thumbnail_url;

      // 3. Upload thumbnail (Independent Step)
      if (selectedFile) {
        console.log("[CourseSubmit] Uploading thumbnail to ImageKit...");
        try {
          setUploadingId('new');
          currentThumbnailUrl = await uploadToImageKit(selectedFile, "/courses");
          console.log("[CourseSubmit] ImageKit success:", currentThumbnailUrl);
        } catch (uploadErr: any) {
          console.error("[CourseSubmit] ImageKit failure:", uploadErr);
          throw new Error(`THUMBNAIL UPLOAD FAILED: ${uploadErr.message}`);
        } finally {
          setUploadingId(null);
        }
      }
      
      // 4. Prepare Payload
      const payload: any = {
        title: formData.title.trim(),
        details: formData.details?.trim() || null,
        price: price,
        discount_price: (discountPrice === 0) ? null : discountPrice,
        category: formData.category,
        thumbnail_url: currentThumbnailUrl || null,
        is_published: !!formData.is_published,
      };

      console.log("[CourseSubmit] Payload:", JSON.stringify(payload, null, 2));

      // 5. Database Operation
      let dbResult;
      if (editingCourse) {
        console.log("[CourseSubmit] Updating course:", editingCourse.id);
        dbResult = await supabase
          .from("courses")
          .update(payload)
          .eq("id", editingCourse.id)
          .select();
      } else {
        console.log("[CourseSubmit] Inserting new course...");
        dbResult = await supabase
          .from("courses")
          .insert(payload)
          .select();
      }

      const { data: result, error: dbError } = dbResult;

      if (dbError) {
        console.error("[CourseSubmit] Supabase DB Error:", dbError);
        throw new Error(`DATABASE ERROR: [${dbError.code}] ${dbError.message}${dbError.hint ? ` | Hint: ${dbError.hint}` : ""}`);
      }

      console.log("[CourseSubmit] Database operation successful. Result:", result);
      
      if (!result || result.length === 0) {
        throw new Error("COURSE NOT SAVED: The database accepted the request but returned no data. This usually means a security policy (RLS) blocked your specific account.");
      }
      
      // 6. Finalize on SUCCESS ONLY
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-courses"] }),
        queryClient.invalidateQueries({ queryKey: ["courses"] })
      ]);
      
      toast.success(editingCourse ? "Course updated successfully" : "Course created successfully", { id: loadingToast });
      
      setIsModalOpen(false);
      setSelectedFile(null);
      setEditingCourse(null);
      setFormData({
        title: "",
        details: "",
        price: "0",
        discount_price: "0",
        category: categories && categories.length > 0 ? categories[0].name : "",
        thumbnail_url: "",
        is_published: true
      });
    } catch (err: any) {
      console.error("[CourseSubmit] Catch block triggered:", err);
      toast.error(err.message || "An unexpected error occurred", { duration: 6000 });
    } finally {
      setIsSubmitting(false);
      console.log("[CourseSubmit] Submission process finished.");
    }
  };

  const { data: categories } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: courses, isLoading } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select(`
          *,
          categories:category (name)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Delete all related data in the correct order to handle foreign keys
      const { error: reviewsError } = await supabase.from("reviews").delete().eq("course_id", id);
      if (reviewsError) console.warn("Reviews deletion error:", reviewsError);

      const { error: examResultsError } = await supabase.from("exam_results").delete().eq("course_id", id);
      if (examResultsError) console.warn("Exam results deletion error:", examResultsError);

      const { error: enrollmentReqError } = await supabase.from("enrollment_requests").delete().eq("course_id", id);
      if (enrollmentReqError) console.warn("Enrollment requests deletion error:", enrollmentReqError);

      const { error: enrollmentsError } = await supabase.from("enrollments").delete().eq("course_id", id);
      if (enrollmentsError) console.warn("Enrollments deletion error:", enrollmentsError);

      const { error: contentsError } = await supabase.from("course_contents").delete().eq("course_id", id);
      if (contentsError) console.warn("Contents deletion error:", contentsError);

      const { error: courseError } = await supabase.from("courses").delete().eq("id", id);
      if (courseError) {
        if (courseError.code === '42501') {
          throw new Error("Permission Denied: Admin access required.");
        }
        throw courseError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      toast.success("Course deleted successfully");
    },
    onError: (error: any) => {
      console.error("Deletion failed:", error);
      toast.error(`Delete failed: ${error.message || "Unknown error"}`);
    }
  });

  const filteredCourses = courses?.filter(course => 
    course.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900">Manage Courses</h2>
          <p className="text-slate-500 font-medium">Create, edit, or remove courses from your platform.</p>
        </div>
        <button 
          onClick={() => {
            setEditingCourse(null);
            setFormData({
              title: "",
              details: "",
              price: "0",
              discount_price: "0",
              category: categories && categories.length > 0 ? categories[0].name : "",
              thumbnail_url: "",
              is_published: true
            });
            setSelectedFile(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-brand text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-brand/20 hover:scale-105 transition active:scale-95"
        >
          <Plus size={20} /> Create New Course
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-900">
                {editingCourse ? "Edit Course" : "Create New Course"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider ml-1">Course Title</label>
                  <input 
                    type="text" 
                    required
                    name="title"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-brand/20 transition font-medium"
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                  />
                  {!formData.title?.trim() && (
                    <p className="text-[10px] text-red-500 font-bold ml-1">Title is required</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider ml-1">Category</label>
                  <select 
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-brand/20 transition font-medium appearance-none"
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                  >
                    {categories?.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                    {(!categories || categories.length === 0) && (
                      <option value="">No categories available</option>
                    )}
                  </select>
                  {!formData.category && (
                    <p className="text-[10px] text-red-500 font-bold ml-1">Please select a category</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-wider ml-1">Thumbnail Cover</label>
                <div className="flex items-center gap-4">
                  {(formData.thumbnail_url || selectedFile) && (
                    <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-100 shrink-0">
                      <img 
                        src={selectedFile ? URL.createObjectURL(selectedFile) : formData.thumbnail_url} 
                        alt="Preview" 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                  )}
                  <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-50 border-2 border-dashed border-slate-200 hover:border-brand/40 hover:bg-brand/5 cursor-pointer transition group">
                    {uploadingId === 'new' ? (
                      <Loader2 size={20} className="animate-spin text-brand" />
                    ) : (
                      <Upload size={20} className="text-slate-400 group-hover:text-brand" />
                    )}
                    <span className="text-sm font-bold text-slate-500 group-hover:text-brand">
                      {uploadingId === 'new' ? 'Uploading...' : (formData.thumbnail_url || selectedFile) ? 'Change Thumbnail' : 'Upload Thumbnail'}
                    </span>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setSelectedFile(file);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider ml-1">Original Price</label>
                  <input 
                    type="number" 
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-brand/20 transition font-medium"
                    value={formData.price}
                    onChange={e => setFormData({...formData, price: e.target.value})}
                  />
                  {isNaN(parseFloat(formData.price)) && (
                    <p className="text-[10px] text-red-500 font-bold ml-1">Must be a valid number</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider ml-1">Discount Price</label>
                  <input 
                    type="number" 
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-brand/20 transition font-medium"
                    value={formData.discount_price}
                    onChange={e => setFormData({...formData, discount_price: e.target.value})}
                  />
                  {formData.discount_price !== "" && isNaN(parseFloat(formData.discount_price)) && (
                    <p className="text-[10px] text-red-500 font-bold ml-1">Must be a valid number or empty</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-wider ml-1">Course Details</label>
                <textarea 
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-brand/20 transition font-medium min-h-[100px]"
                  placeholder="Enter course description..."
                  value={formData.details}
                  onChange={e => setFormData({...formData, details: e.target.value})}
                />
              </div>

              <div className="flex items-center gap-3 py-2">
                <input 
                  type="checkbox" 
                  id="published"
                  className="w-5 h-5 rounded border-slate-200 text-brand focus:ring-brand"
                  checked={formData.is_published}
                  onChange={e => setFormData({...formData, is_published: e.target.checked})}
                />
                <label htmlFor="published" className="text-sm font-bold text-slate-700">Publish immediately</label>
              </div>

              <button 
                type="button"
                onClick={handleCourseSubmit}
                disabled={isSubmitting}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black shadow-lg shadow-slate-200 hover:bg-black transition mt-4 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting && <Loader2 className="animate-spin" size={20} />}
                {editingCourse ? "Save Changes" : "Create Course"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Search by title..." 
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-brand/20 transition font-medium"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button className="p-3 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 transition">
          <Filter size={20} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          [1,2,3].map(i => <div key={i} className="h-64 rounded-[2rem] bg-slate-100 animate-pulse" />)
        ) : (
          filteredCourses?.map((course) => (
            <div key={course.id} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden group hover:shadow-md transition duration-300">
              <div className="aspect-video relative overflow-hidden bg-slate-50">
                {course.thumbnail_url ? (
                  <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover transition duration-500 group-hover:scale-105" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-200">
                    <BookOpen size={48} />
                  </div>
                )}
                <div className="absolute top-4 left-4">
                   <span className="px-3 py-1 bg-white/90 backdrop-blur shadow-sm rounded-lg text-xs font-bold text-slate-900 border border-slate-100">
                     {course.categories?.name || course.category || "Uncategorized"}
                   </span>
                </div>
              </div>
              <div className="p-6">
                <h3 className="font-bold text-slate-900 line-clamp-1 mb-2 group-hover:text-indigo-600 transition">{course.title}</h3>
                <div className="flex items-center justify-between mb-4">
                   <div className="flex flex-col">
                     <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Price</span>
                     <span className="font-black text-slate-900 text-lg">৳{course.price}</span>
                   </div>
                   {course.discount_price && (
                     <div className="flex flex-col text-right">
                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Discount</span>
                        <span className="font-bold text-slate-400 line-through text-sm">৳{course.discount_price}</span>
                     </div>
                   )}
                </div>
                <div className="flex items-center gap-2 pt-4 border-t border-slate-50">
                    <div className="flex-1 flex flex-col gap-2">
                      <button 
                        onClick={() => {
                          setEditingCourse(course);
                          setFormData({
                            title: course.title,
                            details: course.details || "",
                            price: course.price?.toString() || "0",
                            discount_price: course.discount_price?.toString() || "0",
                            category: course.category || "",
                            thumbnail_url: course.thumbnail_url || "",
                            is_published: course.is_published
                          });
                          setSelectedFile(null);
                          setIsModalOpen(true);
                        }}
                        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition ${course.is_published ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-600'}`}
                      >
                        <Edit2 size={16} /> {course.is_published ? 'Published' : 'Draft'}
                      </button>
                      <label className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm bg-indigo-50 text-indigo-600 cursor-pointer hover:bg-indigo-100 transition">
                        {uploadingId === course.id ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                        <span>{uploadingId === course.id ? 'Uploading...' : 'Thumbnail'}</span>
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                              setUploadingId(course.id);
                              const url = await uploadToImageKit(file, "/courses");
                              const { error } = await supabase.from("courses").update({ thumbnail_url: url }).eq("id", course.id);
                              if (error) throw error;
                              queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
                              toast.success("Thumbnail updated");
                            } catch (err: any) {
                              toast.error(err.message);
                            } finally {
                              setUploadingId(null);
                            }
                          }}
                        />
                      </label>
                    </div>
                   <button 
                     onClick={() => window.confirm("Are you sure?") && deleteMutation.mutate(course.id)}
                     className="p-2.5 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white transition"
                   >
                     <Trash2 size={16} />
                   </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
