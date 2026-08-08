import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Settings, Save, Globe, Lock, Shield, Palette } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/settings")({
  component: SettingsAdmin,
});

function SettingsAdmin() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("*");
      if (error) throw error;
      
      const settingsMap: any = {};
      data?.forEach(item => {
        settingsMap[item.key] = item.value;
      });

      return { 
        title: settingsMap.hero_title || "Gators Learning", 
        subtitle: settingsMap.hero_subtitle || "The ultimate platform for admission & skills.",
        primary_color: settingsMap.primary_color || "#3B82F6",
        contact_email: settingsMap.contact_email || "support@gators.com",
        announcement: settingsMap.announcement || ""
      };
    },
  });

  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    primary_color: "",
    contact_email: "",
    announcement: ""
  });

  useEffect(() => {
    if (settings) {
      setForm({
        title: settings.title || "",
        subtitle: settings.subtitle || "",
        primary_color: settings.primary_color || "#3B82F6",
        contact_email: settings.contact_email || "",
        announcement: settings.announcement || ""
      });
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const updates = [
        { key: 'hero_title', value: payload.title },
        { key: 'hero_subtitle', value: payload.subtitle },
        { key: 'primary_color', value: payload.primary_color },
        { key: 'contact_email', value: payload.contact_email },
        { key: 'announcement', value: payload.announcement }
      ];

      for (const update of updates) {
        const { error } = await supabase.from("site_settings").upsert({ 
          key: update.key,
          value: update.value,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      toast.success("Settings updated successfully");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-black text-slate-900">Site Settings</h2>
        <p className="text-slate-500 font-medium">Configure global branding and site-wide metadata.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm space-y-6">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Globe size={20} className="text-brand" /> General Configuration
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-500 mb-2">Website Title</label>
                <input 
                  type="text" 
                  className="w-full p-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-brand/20 transition font-bold"
                  value={form.title}
                  onChange={(e) => setForm({...form, title: e.target.value})}
                  placeholder="e.g. Gators Learning"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-500 mb-2">Subtitle / Tagline</label>
                <textarea 
                  rows={3}
                  className="w-full p-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-brand/20 transition font-medium"
                  value={form.subtitle}
                  onChange={(e) => setForm({...form, subtitle: e.target.value})}
                  placeholder="e.g. Your journey to success starts here..."
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-500 mb-2">Support Email</label>
                <input 
                  type="email" 
                  className="w-full p-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-brand/20 transition font-bold"
                  value={form.contact_email}
                  onChange={(e) => setForm({...form, contact_email: e.target.value})}
                  placeholder="support@example.com"
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm space-y-6">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Palette size={20} className="text-brand" /> Branding & Visuals
            </h3>
            
            <div className="flex items-center gap-6">
               <div 
                 className="w-20 h-20 rounded-3xl shadow-inner flex items-center justify-center border-4 border-white"
                 style={{ backgroundColor: form.primary_color }}
               >
                  <span className="text-white font-black text-xs">Primary</span>
               </div>
               <div className="flex-1">
                  <label className="block text-sm font-bold text-slate-500 mb-2">Primary Color Hex</label>
                  <input 
                    type="text" 
                    className="w-full p-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-brand/20 transition font-mono font-bold"
                    value={form.primary_color}
                    onChange={(e) => setForm({...form, primary_color: e.target.value})}
                  />
               </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm sticky top-8 space-y-6">
             <div className="p-4 rounded-2xl bg-brand/5 border border-brand/10">
                <h4 className="text-sm font-black text-brand uppercase tracking-widest mb-2 flex items-center gap-2">
                   <Shield size={14} /> Security Status
                </h4>
                <p className="text-xs text-slate-500 font-medium">You are currently logged in as Administrator. All changes are logged.</p>
             </div>

             <button 
               onClick={() => updateMutation.mutate(form)}
               disabled={updateMutation.isPending}
               className="w-full py-4 bg-brand text-white rounded-2xl font-black shadow-lg shadow-brand/20 hover:scale-[1.02] active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-2"
             >
               <Save size={20} />
               {updateMutation.isPending ? "Saving..." : "Save Changes"}
             </button>

             <button className="w-full py-4 bg-slate-50 text-slate-500 rounded-2xl font-black hover:bg-slate-100 transition flex items-center justify-center gap-2">
               <Lock size={20} />
               Change Password
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
