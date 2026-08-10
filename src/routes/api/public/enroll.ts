import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/public/enroll')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const data = await request.json();
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          
          // 1. Create User if not exists
          let userId;
          const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
          const existingUser = usersData?.users.find(u => u.email === data.email);
          
          if (!existingUser) {

            const { data: newUser, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
              email: data.email,
              password: data.generatedPassword || data.rollNumber,
              email_confirm: true,
              user_metadata: {
                full_name: data.fullName,
                roll_number: data.rollNumber
              }
            });
            
            if (signUpError) throw signUpError;
            userId = newUser.user.id;
            userId = existingUser.id;
          }


          // 2. Ensure Profile exists
          await supabaseAdmin.from("profiles").upsert({
            id: userId,
            full_name: data.fullName,
            roll_number: data.rollNumber,
            mobile: data.phone
          });

          // 3. Create Enrollment Request
          const { error: enrollError } = await supabaseAdmin.from("enrollment_requests").insert({
            user_id: userId,
            course_id: data.courseId,
            full_name: data.fullName,
            email: data.email,
            mobile: data.phone,
            transaction_id: data.trxId,
            roll_number: data.rollNumber,
            status: "pending"
          });

          if (enrollError) throw enrollError;

          return new Response(JSON.stringify({ success: true, rollNumber: data.rollNumber }), {
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (error: any) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
    }
  }
});
