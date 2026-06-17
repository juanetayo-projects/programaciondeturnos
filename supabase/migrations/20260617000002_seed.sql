-- ============================================================
-- Datos semilla
-- ============================================================

-- ---------- Festivos Colombia 2026 (sin domingos; se calculan aparte) ----------
insert into festivos_colombia (fecha, nombre) values
  ('2026-01-01','Año Nuevo'),
  ('2026-01-12','Reyes Magos'),
  ('2026-03-23','Día de San José'),
  ('2026-04-02','Jueves Santo'),
  ('2026-04-03','Viernes Santo'),
  ('2026-05-01','Día del Trabajo'),
  ('2026-05-18','Ascensión del Señor'),
  ('2026-06-08','Corpus Christi'),
  ('2026-06-15','Sagrado Corazón'),
  ('2026-06-29','San Pedro y San Pablo'),
  ('2026-07-20','Día de la Independencia'),
  ('2026-08-07','Batalla de Boyacá'),
  ('2026-08-17','Asunción de la Virgen'),
  ('2026-10-12','Día de la Raza'),
  ('2026-11-02','Todos los Santos'),
  ('2026-11-16','Independencia de Cartagena'),
  ('2026-12-08','Inmaculada Concepción'),
  ('2026-12-25','Navidad')
on conflict (fecha) do nothing;

-- ---------- Cargos ----------
insert into cargos (nombre) values
  ('Jefe de Enfermería'),
  ('Auxiliar de Enfermería')
on conflict (nombre) do nothing;

-- ---------- Servicio inicial ----------
insert into servicios (nombre) values ('UCI UCIN')
on conflict (nombre) do nothing;

-- ---------- Catálogo de siglas (unión de ambas hojas del Excel) ----------
insert into catalogo_siglas (sigla, descripcion, horas, es_ausencia, categoria_capacidad, orden) values
  ('D',   'Turno 12 hrs Día (07:00-19:00)',                12, false, 'dia',    10),
  ('N',   'Turno 12 hrs Noche (19:00-07:00)',              12, false, 'noche',  20),
  ('M8',  'Mañana 8 hrs (06:00-14:00)',                     8, false, 'manana', 30),
  ('T8',  'Tarde 8 hrs (14:00-22:00)',                      8, false, 'tarde',  40),
  ('N8',  'Noche 8 hrs (22:00-06:00)',                      8, false, 'noche8', 50),
  ('D1',  'Turno 11 hrs Día',                              11, false, 'dia',    60),
  ('N1',  'Turno 11 hrs Noche',                            11, false, 'noche',  70),
  ('D2',  'Turno 12 hrs día (compensa 1h con DE)',         12, false, 'dia',    80),
  ('DE',  'Día de capacitación (8h + 4h jornada)',          8, false, null,     90),
  ('Din', 'Turno 12 hrs Día - Inducción',                  12, false, 'dia',   100),
  ('DN',  'Turno 24 hrs (necesidad del servicio)',         24, false, null,    110),
  ('TN',  'Turno 18 hrs (13:00-07:00)',                    18, false, null,    120),
  ('NM',  'Turno 18 hrs (19:00-13:00)',                    18, false, null,    130),
  ('M2',  'Turno 2 hrs Día (07:00-09:00)',                  2, false, null,    140),
  ('DA',  'Día Administrativo',                             8, false, null,    150),
  ('M',   'Mañana 6 hrs (07:00-13:00)',                     6, false, 'manana',160),
  ('T',   'Tarde 6 hrs (13:00-19:00)',                      6, false, 'tarde', 170),
  ('L',   'Día Libre',                                      0, true,  null,    200),
  ('V',   'Vacaciones',                                     0, true,  null,    210),
  ('DF',  'Día de la Familia',                              0, true,  null,    220),
  ('INC', 'Incapacidad',                                    0, true,  null,    230),
  ('INJ', 'Inasistencia No Justificada',                    0, true,  null,    240),
  ('LIC', 'Licencia/Permiso no Remunerado',                 0, true,  null,    250),
  ('CAL', 'Calamidad',                                      0, true,  null,    260),
  ('RD',  'Renuncia/Despido',                               0, true,  null,    270),
  ('SUS', 'Suspendido',                                     0, true,  null,    280)
on conflict (sigla) do nothing;

-- ---------- Reglas de color (horas semanales) ----------
insert into reglas_color (nombre, operador, valor_min, valor_max, color, texto, orden) values
  ('Cumple 44h',  '=',       44, null, '#0D2D6B', '#FFFFFF', 10),
  ('Sobrecarga >44h', '>',    44, null, '#C0392B', '#FFFFFF', 20),
  ('Entre 40 y 43h', 'between', 40, 43.99, '#E1A100', '#1f2937', 30),
  ('Subcarga <40h', '<',      40, null, '#1E8449', '#FFFFFF', 40);

-- ---------- Convenciones de recargo (hoja "Convenciones") ----------
insert into convenciones_recargo (codigo, nombre, horas, hdo, hno, hdf, hnf, dia_siguiente, observacion) values
  ('nord','Nocturno Ord. Corrido (19:00-07:00)',12,1,11,0,0,'ord','OK'),
  ('nord','Nocturno Ord. Corrido (19:00-07:00)',12,0,5,1,6,'fes','OK'),
  ('pord','Noche 11 hrs (19:00-06:00)',11,0,11,0,0,'ord','OK'),
  ('pord','Noche 11 hrs (19:00-06:00)',11,0,5,0,6,'fes','OK'),
  ('t8ord','Tarde 8 hrs (14:00-22:00)',8,5,3,0,0,'ord',null),
  ('t8fes','Tarde 8 hrs (14:00-22:00) festivo',8,0,0,5,3,'fes',null),
  ('aord','Turno Ord (08:00-17:00)',9,9,0,0,0,'ord',null),
  ('afes','Turno Ord (08:00-17:00) festivo',9,0,0,9,0,'fes',null),
  ('bord','Turno Ord (08:00-16:00)',8,8,0,0,0,'ord',null),
  ('bfes','Turno Ord (08:00-16:00) festivo',8,0,0,8,0,'fes',null),
  ('cord','Día 11 hrs (07:00-18:00)',11,11,0,0,0,'ord',null),
  ('cfes','Día 11 hrs (07:00-18:00) festivo',11,0,0,11,0,'fes',null),
  ('dord','Diurno Ord. Corrido 12 (07:00-19:00)',12,12,0,0,0,'ord',null),
  ('dfes','Diurno Corrido 12 (07:00-19:00) festivo',12,0,0,12,0,'fes',null),
  ('libre','Libre',0,0,0,0,0,'ord',null),
  ('mord','Mañana Ord (07:00-13:00)',6,6,0,0,0,'ord',null),
  ('mfes','Mañana Ord (07:00-13:00) festivo',6,0,0,6,0,'fes',null),
  ('tord','Tarde Ord (13:00-19:00)',6,6,0,0,0,'ord',null),
  ('tfes','Tarde Ord (13:00-19:00) festivo',6,0,0,6,0,'fes',null),
  ('m8ord','Mañana 8 hrs (06:00-14:00)',8,8,0,0,0,'ord',null),
  ('m8fes','Mañana 8 hrs (06:00-14:00) festivo',8,0,0,8,0,'fes',null),
  ('n8ord','Noche 8 hrs (22:00-06:00)',8,0,8,0,0,'ord','OK'),
  ('n8ord','Noche 8 hrs (22:00-06:00)',8,0,2,0,6,'fes','OK'),
  ('n8fes','Noche 8 hrs festivo (22:00-06:00)',8,0,6,0,2,'ord','OK'),
  ('n8fes','Noche 8 hrs festivo (22:00-06:00)',8,0,0,0,8,'fes','OK'),
  ('nfes','Nocturno Fest. Corrido (19:00-07:00)',12,1,6,0,5,'ord','OK'),
  ('nfes','Nocturno Fest. Corrido (19:00-07:00)',12,0,0,1,11,'fes','OK');

-- ---------- Mapeo sigla -> base de convención ----------
-- revisado=false marca las que el admin debe confirmar.
insert into mapeo_siglas_convencion (sigla_id, base_codigo, revisado)
select s.id, m.base, m.rev
from catalogo_siglas s
join (values
  ('D','d',   true),
  ('N','n',   true),
  ('M8','m8', true),
  ('T8','t8', true),
  ('N8','n8', true),
  ('D1','c',  true),    -- 11h día
  ('N1','p',  true),    -- 11h noche
  ('M','m',   true),
  ('T','t',   true),
  ('Din','d', true),
  ('D2','d',  false),
  ('DE','b',  false),
  ('DA','b',  false),
  ('M2',null, false),
  ('DN',null, false),
  ('TN',null, false),
  ('NM',null, false),
  ('L',null,  true),
  ('V',null,  true),
  ('DF',null, true),
  ('INC',null,true),
  ('INJ',null,true),
  ('LIC',null,true),
  ('CAL',null,true),
  ('RD',null, true),
  ('SUS',null,true)
) as m(sigla, base, rev) on m.sigla = s.sigla
on conflict (sigla_id) do nothing;
