-- Seed de propiedades activas del marketplace (dueño: juanp). Idempotente.
delete from public.properties where owner_id = 'a662b18f-d952-4673-b0d8-22f5f2031f8d' and status = 'active';

insert into public.properties (owner_id,title,type,zona,address,price,status,image,rating,beds,baths,m2,cochera,agent) values
('a662b18f-d952-4673-b0d8-22f5f2031f8d','Departamento 2 amb. a estrenar','vivienda','Área Centro Este','Alderete 1240',385000,'active','https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=900&q=80',4.9,1,1,48,true,'Est. Álvarez'),
('a662b18f-d952-4673-b0d8-22f5f2031f8d','Casa 3 dorm. con parque','vivienda','Rincón de Emilio','Los Álamos 830',720000,'active','https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=900&q=80',4.8,3,2,130,true,'M. Ríos'),
('a662b18f-d952-4673-b0d8-22f5f2031f8d','Local comercial sobre avenida','comercial','Área Centro','Av. Argentina 455',950000,'active','https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=900&q=80',4.7,0,1,85,false,'Est. Álvarez'),
('a662b18f-d952-4673-b0d8-22f5f2031f8d','Monoambiente premium','vivienda','Universidad','Buenos Aires 670',265000,'active','https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=80',4.6,0,1,32,false,'L. Sosa'),
('a662b18f-d952-4673-b0d8-22f5f2031f8d','Galpón industrial 400 m2','industrial','Parque Industrial','Ruta 7 km 3',2100000,'active','https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=900&q=80',4.5,0,2,400,true,'M. Ríos'),
('a662b18f-d952-4673-b0d8-22f5f2031f8d','Departamento 3 amb. con balcón','vivienda','Área Centro Oeste','Córdoba 190',510000,'active','https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=900&q=80',4.9,2,1,72,true,'Est. Álvarez'),
('a662b18f-d952-4673-b0d8-22f5f2031f8d','Oficina en edificio corporativo','comercial','Área Centro','Roca 320, piso 4',640000,'active','https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=900&q=80',4.8,0,1,60,true,'C. Vega'),
('a662b18f-d952-4673-b0d8-22f5f2031f8d','PH 2 dorm. reciclado','vivienda','Barrio Bardas','Chubut 1450',430000,'active','https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=900&q=80',4.7,2,1,65,false,'L. Sosa');
