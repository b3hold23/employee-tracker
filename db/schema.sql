DROP TABLE IF EXISTS employee, roles, departments CASCADE;

CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(30) UNIQUE NOT NULL
);

CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    title VARCHAR(30) UNIQUE NOT NULL,
    salary NUMERIC NOT NULL,
    departments_id INTEGER NOT NULL REFERENCES departments(id)
);

CREATE TABLE employee (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(30) NOT NULL,
    last_name VARCHAR(30) NOT NULL,
    roles_id INTEGER NOT NULL REFERENCES roles(id),
    manager_id INTEGER REFERENCES employee(id),
    CONSTRAINT unique_employee_name UNIQUE (first_name, last_name)
);

