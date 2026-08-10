import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const enrollmentSchema = z.object({
  courseId: z.string(),
  fullName: z.string(),
  email: z.string().email(),
  phone: z.string(),
  trxId: z.string(),
  rollNumber: z.string(),
  generatedPassword: z.string().optional()
});

export const processEnrollment = createServerFn({ method: "POST" })
  .inputValidator((data) => enrollmentSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    // 1. Create User if not exists
    let userId;
    const { data: userData, error: getUserError } = await supabaseAdmin.auth.admin.getUserByEmail(data.email);
    
    if (getUserError || !userData?.user) {
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
    } else {
      userId = userData.user.id;
    }

    // 2. Ensure Profile exists with correct roll number
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

    return { success: true, rollNumber: data.rollNumber };
  });
