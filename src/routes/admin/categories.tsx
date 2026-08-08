import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Folders, Edit2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/categories")({
  component: CategoriesAdmin,
});

function CategoriesAdmin() {
  const [catName, setCatName] = useState("");
  const queryClient = useQueryClient();

  const { data: categories, isLoading } = useQuery({
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

  const addMutation = useMutation({
    mutationFn: async (name: string) => {
      console.log("Adding category:", name);
      console.log("Attempting insert with name:", name);
      const { data, error } = await supabase.from("categories").insert({ name }).select();
      if (error) {
        console.error("Insert error details:", error);
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      toast.success("Category added successfully");
      setCatName("");
    },
    onError: (err: any) => {
      console.error("Add category error:", err);
      toast.error(err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log("Attempting delete with id:", id);
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) {
        console.error("Delete error details:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      toast.success("Category deleted");
    },
    onError: (err: any) => toast.error("Could not delete category. It might be in use."),
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm sticky top-0">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Create Category</h3>
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (catName.trim()) addMutation.mutate(catName.trim());
              }}
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Category Name *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. Web Development" 
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg px-4 py-2 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={addMutation.isPending}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg transition-colors flex justify-center items-center gap-2"
                >
                  <Plus size={18} /> {addMutation.isPending ? "Adding..." : "Add Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-900">Existing Categories</h3>
            </div>
            <div className="p-0">
              <ul className="divide-y divide-slate-100">
                {isLoading ? (
                   <li className="p-6 text-center text-slate-400 text-sm">Loading categories...</li>
                ) : categories?.length === 0 ? (
                   <li className="p-6 text-center text-slate-400 text-sm">No categories found.</li>
                ) : (
                  categories?.map((cat: any) => (
                    <li key={cat.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                          <Folders size={16} />
                        </div>
                        <span className="font-semibold text-slate-700">{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => {
                            const newName = window.prompt("Edit category name:", cat.name);
                            if (newName && newName !== cat.name) {
                              supabase.from("categories").update({ name: newName }).eq("id", cat.id).then(() => {
                                queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
                                toast.success("Category updated");
                              });
                            }
                          }}
                          className="p-2 text-slate-400 hover:text-brand transition"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => window.confirm("Delete this category?") && deleteMutation.mutate(cat.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 transition"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
