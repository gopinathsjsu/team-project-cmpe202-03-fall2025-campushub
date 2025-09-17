-- USERS (make sure sellers exist before inserting listings)
INSERT INTO users (id, name, email, role) VALUES
('11111111-1111-1111-1111-111111111111','Demo Seller','seller@campus.edu','seller'),
('22222222-2222-2222-2222-222222222222','Alice Seller','alice@campus.edu','seller'),
('33333333-3333-3333-3333-333333333333','Bob Seller','bob@campus.edu','seller'),
('44444444-4444-4444-4444-444444444444','Buyer One','buyer1@campus.edu','buyer'),
('55555555-5555-5555-5555-555555555555','Admin One','admin@campus.edu','admin')
ON CONFLICT (id) DO NOTHING;

-- LISTINGS (Textbooks, Gadgets, Essentials, Other)
INSERT INTO listings (id, seller_id, title, description, category, price, condition, status) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01','11111111-1111-1111-1111-111111111111','CMPE 202 Textbook','Used, good condition, pickup at library','Textbooks',35.00,'Good','active'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa02','11111111-1111-1111-1111-111111111111','CMPE 273 Textbook','Like new, no markings','Textbooks',40.00,'LikeNew','active'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa03','11111111-1111-1111-1111-111111111111','MATH 133A Textbook','Some highlights, great for midterms','Textbooks',25.00,'Good','active'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa04','22222222-2222-2222-2222-222222222222','BIO 101 Textbook','Fair condition, worn cover','Textbooks',15.00,'Fair','active'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa05','22222222-2222-2222-2222-222222222222','TI-84 Plus Calculator','Barely used','Gadgets',60.00,'LikeNew','active'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa06','33333333-3333-3333-3333-333333333333','Raspberry Pi 4 (4GB)','Includes case and power supply','Gadgets',45.00,'Good','active'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa07','33333333-3333-3333-3333-333333333333','Noise-Cancelling Headphones','Great battery life','Gadgets',80.00,'Good','active'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa08','11111111-1111-1111-1111-111111111111','27-inch Monitor (1080p)','Minor scratch, works fine','Gadgets',120.00,'Fair','active'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa09','22222222-2222-2222-2222-222222222222','Mini Fridge','Clean, perfect for dorm','Essentials',90.00,'Good','active'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa0a','11111111-1111-1111-1111-111111111111','Desk Lamp w/ USB','Brand new in box','Essentials',12.00,'New','active'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa0b','33333333-3333-3333-3333-333333333333','USB-C Hub (7-in-1)','HDMI + SD + USB 3','Gadgets',18.00,'Good','active'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa0c','22222222-2222-2222-2222-222222222222','Campus Bike','Needs tune-up, rides well','Other',150.00,'Fair','active'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa0d','11111111-1111-1111-1111-111111111111','Dorm Couch','Comfortable, free delivery on campus','Other',100.00,'Good','active'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa0e','33333333-3333-3333-3333-333333333333','PHY 2A Textbook','Hardly used, like new','Textbooks',30.00,'LikeNew','active'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa0f','22222222-2222-2222-2222-222222222222','Mechanical Keyboard','Hot-swappable switches','Gadgets',55.00,'Good','active')
ON CONFLICT (id) DO NOTHING;
