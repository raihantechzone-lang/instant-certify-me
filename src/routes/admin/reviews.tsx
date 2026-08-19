import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Star, Check, X, Image as ImageIcon, Trash2, Power, Pause, Play, Plus, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/reviews")({
  component: ReviewsAndAdsAdmin,
});

function ReviewsAndAdsAdmin() {
  const queryClient = useQueryClient();

  const { data: reviews } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: ads } = useQuery({
    queryKey: ["admin-ads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_ads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const approveReviewMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reviews").update({ is_approved: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      toast.success("Review approved");
    },
  });

  const toggleAdMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("app_ads").update({ is_active: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ads"] });
      toast.success("Ad status updated");
    },
  });

  const deleteAdMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("app_ads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ads"] });
      toast.success("Ad deleted");
    },
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Reviews Section */}
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-black text-slate-900">Student Reviews</h2>
            <p className="text-slate-500 font-medium text-sm">Approve student reviews before they show on the website.</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-100">
            {reviews?.length === 0 ? (
              <div className="p-8 text-center text-slate-400 font-medium italic">No reviews yet.</div>
            ) : (
              reviews?.map((review) => (
                <div key={review.id} className="p-6 hover:bg-slate-50 transition group">
                   <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
                           <Users size={18} className="text-slate-400" />
                         </div>
                         <div>
                            <p className="font-bold text-slate-900">{review.student_name || "Student"}</p>
                            <div className="flex items-center gap-1 text-amber-400">
                               {[...Array(review.rating || 5)].map((_, i) => <Star key={i} size={12} fill="currentColor" />)}
                            </div>
                         </div>
                      </div>
                      <div className="flex items-center gap-2">
                         {!review.is_approved && (
                           <button 
                             onClick={() => approveReviewMutation.mutate(review.id)}
                             className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition"
                           >
                             <Check size={18} />
                           </button>
                         )}
                         <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${
                           review.is_approved ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                         }`}>
                           {review.is_approved ? 'approved' : 'pending'}
                         </span>
                      </div>
                   </div>
                   <p className="mt-4 text-slate-600 text-sm leading-relaxed italic">"{review.comment}"</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Ads Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-900">Interstitial Ads</h2>
              <p className="text-slate-500 font-medium text-sm">Manage full-screen overlays shown on entry.</p>
            </div>
            <button 
              onClick={() => {
                const img = window.prompt("Image URL:");
                const link = window.prompt("Link URL (optional):");
                if (img) {
                   supabase.from("app_ads").insert({ image_url: img, target_link: link, is_active: true }).then(() => {
                     queryClient.invalidateQueries({ queryKey: ["admin-ads"] });
                     toast.success("Ad created");
                   });
                }
              }}
              className="p-3 bg-brand text-white rounded-xl shadow-lg shadow-brand/20 hover:scale-105 transition active:scale-95"
            >
               <Plus size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {ads?.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-200 text-center text-slate-400 italic">
                No ads configured.
              </div>
            ) : (
              ads?.map((ad) => (
                <div key={ad.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 group hover:shadow-md transition">
                   <div className="w-24 aspect-[4/5] bg-slate-100 rounded-2xl overflow-hidden flex-shrink-0">
                      {ad.image_url ? (
                        <img src={ad.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <ImageIcon size={32} />
                        </div>
                      )}
                   </div>
                   <div className="flex-1">
                       <p className="font-bold text-slate-900 mb-1">{ad.id.split('-')[0] || "Untitled Ad"}</p>
                      <div className="flex items-center gap-2">
                         <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${
                           ad.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                         }`}>
                           {ad.is_active ? 'Active' : 'Paused'}
                         </span>
                         {ad.target_link && <p className="text-xs text-brand truncate max-w-[150px]">{ad.target_link}</p>}
                      </div>
                   </div>
                   <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                      <button 
                         onClick={() => toggleAdMutation.mutate({ id: ad.id, active: !ad.is_active })}
                         className={`p-2.5 rounded-xl transition ${
                           ad.is_active ? 'bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white'
                         }`}
                      >
                        {ad.is_active ? <Pause size={18} /> : <Play size={18} />}
                      </button>
                      <button 
                        onClick={() => window.confirm("Delete this ad?") && deleteAdMutation.mutate(ad.id)}
                        className="p-2.5 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white transition"
                      >
                        <Trash2 size={18} />
                      </button>
                   </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

