-- Permitir que el coordinador traslade a sus colaboradores a otro servicio (rotación).
-- USING limita qué filas existentes puede tocar (las de su servicio);
-- WITH CHECK permite que el nuevo servicio sea cualquiera (para mover/ingresar).
drop policy if exists colab_write on colaboradores;
create policy colab_write on colaboradores for all
  using (es_admin() or (rol_actual() = 'coordinador' and servicio_id = servicio_actual()))
  with check (es_admin() or rol_actual() = 'coordinador');
