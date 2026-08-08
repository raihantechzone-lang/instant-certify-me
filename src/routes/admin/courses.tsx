import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Edit2, Search, Filter, BookOpen } from "lucide-react";

import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/courses")({
  component: CoursesAdmin,
});

function CoursesAdmin() {
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();

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
      if (courseError) throw courseError;
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
          onClick={async () => {
            const title = window.prompt("Enter Course Title:");
            if (title) {
               const { error } = await supabase.from("courses").insert({ 
                 title, 
                 price: 0, 
                 category: 'University Admission',
                 is_published: false // New courses are draft by default
               });
               
               if (error) {
                 toast.error(`Failed to create: ${error.message}`);
               } else {
                 queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
                 toast.success("Course created as draft");
               }
            }
          }}
          className="flex items-center gap-2 bg-brand text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-brand/20 hover:scale-105 transition active:scale-95"
        >
          <Plus size={20} /> Create New Course
        </button>
      </div>

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
                    <button 
                      onClick={() => {
                        const newTitle = window.prompt("Update Course Title:", course.title);
                        const newPrice = window.prompt("Update Price:", course.price?.toString() || "0");
                        const newCategory = window.prompt("Update Category:", course.category || "");
                        const publish = window.confirm(course.is_published ? "Unpublish this course?" : "Publish this course?");
                        
                        if (newTitle !== null) {
                          const updateCourse = async () => {
                            const { error } = await supabase
                              .from("courses")
                              .update({ 
                                title: newTitle, 
                                price: parseFloat(newPrice || "0"),
                                category: newCategory,
                                is_published: course.is_published ? !publish : publish
                              })
                              .eq("id", course.id);
                            
                            if (error) {
                              console.error("Update error:", error);
                              toast.error(`Error: ${error.message}`);
                            } else {
                              queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
                              toast.success("Course updated");
                            }
                          };
                          updateCourse();
                        }
                      }}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition ${course.is_published ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-600'}`}
                    >
                      <Edit2 size={16} /> {course.is_published ? 'Published' : 'Draft'}
                    </button>
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
