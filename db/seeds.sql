INSERT INTO departments (name) VALUES
  ('Sales'),
  ('Marketing'),
  ('IT'),
  ('Finance'),
  ('HR')
ON CONFLICT (name) DO NOTHING;

INSERT INTO roles (title, salary, departments_id) VALUES
  ('Sales Manager', 80000, 1),
  ('Marketing Manager', 90000, 2),
  ('IT Manager', 100000, 3),
  ('Financial Analyst', 60000, 4),
  ('HR Generalist', 50000, 5),
  ('Sales Representative', 40000, 1),
  ('Marketing Coordinator', 45000, 2),
  ('Software Engineer', 70000, 3),
  ('Accountant', 55000, 4),
  ('HR Assistant', 40000, 5)
ON CONFLICT (title) DO NOTHING;

INSERT INTO employee (first_name, last_name, roles_id, manager_id) VALUES
  ('John', 'Doe', 1, NULL),
  ('Jane', 'Smith', 2, NULL),
  ('Bob', 'Johnson', 3, NULL),
  ('Alice', 'Williams', 4, NULL),
  ('Mike', 'Davis', 5, NULL),
  ('Emily', 'Chen', 6, 1),
  ('David', 'Lee', 7, 2),
  ('Sarah', 'Taylor', 8, 3),
  ('Kevin', 'White', 9, 4),
  ('Lisa', 'Nguyen', 10, 5)
ON CONFLICT (first_name, last_name) DO NOTHING;
