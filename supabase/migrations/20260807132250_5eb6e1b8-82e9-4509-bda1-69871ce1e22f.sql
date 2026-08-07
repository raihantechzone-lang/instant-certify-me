-- Ensure Admin can manage everything
CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can manage courses" ON public.courses FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can manage profiles" ON public.profiles FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can manage enrollments" ON public.enrollments FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can manage course contents" ON public.course_contents FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can manage enrollment requests" ON public.enrollment_requests FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can manage exam results" ON public.exam_results FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can manage ads" ON public.ads FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can manage site settings" ON public.site_settings FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can manage reviews" ON public.reviews FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can manage user roles" ON public.user_roles FOR ALL TO authenticated USING (public.is_admin());
