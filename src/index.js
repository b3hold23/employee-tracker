const inquirer = require("inquirer");
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool ({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT,
}); 

async function executeSQLFile(filePath) {
    const absolutePath = path.join(__dirname, '..', 'db', filePath);
    try {
        const sql = fs.readFileSync(absolutePath, 'utf8');
        console.log(`SQL content: ${sql}`);

        await pool.query('BEGIN');
        await pool.query(sql);
        await pool.query('COMMIT');

        console.log('SQL file executed successfully:', filePath);
    } catch (err) {
        console.log('Error executing sql file', err)
        await pool.query('ROLLBACK');
    }
}

let isDatabaseLoaded = false; // Flag to track if the database has been loaded

function loadDataBase() {
    return new Promise((resolve, reject) => {
        if (!isDatabaseLoaded) {
            isDatabaseLoaded = true;
            // Your code to load database schema and seeds here
            resolve();
        } else {
            resolve(); // Database is already loaded, no need to reload
        }
    });
}

console.log('Loading database...');
loadDataBase()
  .then(() => {
    console.log('Database loaded successfully');
    mainMenu(); // Only show the menu after the database has loaded successfully
  })
  .catch(err => console.error('Error initializing database', err));

  async function addEmployee() {
    try {
        // Fetch roles and managers for selection
        const rolesResult = await pool.query('SELECT id, title FROM roles');
        const roles = rolesResult.rows;

        const managersResult = await pool.query('SELECT id, first_name, last_name FROM employee');
        const managers = managersResult.rows;
        
        // Prompt user for employee details
        const answers = await inquirer.prompt([
            {
                type: 'input',
                name: 'firstName',
                message: 'Enter the first name of the employee:',
                validate: input => input ? true : 'First name cannot be empty'
            },
            {
                type: 'input',
                name: 'lastName',
                message: 'Enter the last name of the employee:',
                validate: input => input ? true : 'Last name cannot be empty'
            },
            {
                type: 'list',
                name: 'roleId',
                message: 'Select the role of the employee:',
                choices: roles.map(role => ({ name: role.title, value: role.id })),
                filter: value => parseInt(value) // Ensure roleId is an integer
            },
            {
                type: 'list',
                name: 'managerId',
                message: 'Select the manager of the employee (or leave empty if none):',
                choices: [{ name: 'None', value: null }].concat(managers.map(manager => ({ name: `${manager.first_name} ${manager.last_name}`, value: manager.id }))),
                filter: value => value === 'None' ? null : parseInt(value) // Ensure managerId is null or integer
            }
        ]);

        // Insert the new employee into the database
        const { firstName, lastName, roleId, managerId } = answers;
        await pool.query(
            'INSERT INTO employee (first_name, last_name, roles_id, manager_id) VALUES ($1, $2, $3, $4)',
            [firstName, lastName, roleId, managerId]
        );

        console.log('Employee added successfully.');
        mainMenu(); // Return to the main menu after adding the employee
    } catch (err) {
        console.error('Error adding employee:', err);
        mainMenu(); // Return to the main menu in case of an error
    }
}

function addDepartment() {
  inquirer
      .prompt({
          type: 'input',
          name: 'departmentName',
          message: 'Enter the name of the new department:',
          validate: input => input ? true : 'Department name cannot be empty.',
      })
      .then(async (answers) => {
          const { departmentName } = answers;

          try {
              const result = await pool.query(
                  'INSERT INTO departments (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING *',
                  [departmentName]
              );

              if (result.rowCount > 0) {
                  console.log(`Department '${departmentName}' added successfully.`);
              } else {
                  console.log(`Department '${departmentName}' already exists.`);
              }
          } catch (err) {
              console.error('Error adding department:', err);
          }

          // Show the main menu again after adding the department
          mainMenu();
      });
}

async function addRole() {
  try {
      // Get the list of departments for the user to choose from
      const departmentsResult = await pool.query('SELECT id, name FROM departments');
      const departments = departmentsResult.rows;

      // Prompt the user for role details
      const answers = await inquirer.prompt([
          {
              type: 'input',
              name: 'roleTitle',
              message: 'Enter the title of the new role:',
              validate: input => input ? true : 'Role title cannot be empty.',
          },
          {
              type: 'input',
              name: 'roleSalary',
              message: 'Enter the salary for the new role:',
              validate: input => !isNaN(input) && parseFloat(input) > 0 ? true : 'Salary must be a positive number.',
              filter: input => parseFloat(input),
          },
          {
              type: 'list',
              name: 'departmentId',
              message: 'Select the department for this role:',
              choices: departments.map(department => ({
                  name: department.name,
                  value: department.id
              })),
          }
      ]);

      const { roleTitle, roleSalary, departmentId } = answers;

      // Insert the new role into the database
      const result = await pool.query(
          'INSERT INTO roles (title, salary, departments_id) VALUES ($1, $2, $3) ON CONFLICT (title) DO NOTHING RETURNING *',
          [roleTitle, roleSalary, departmentId]
      );

      if (result.rowCount > 0) {
          console.log(`Role '${roleTitle}' added successfully.`);
      } else {
          console.log(`Role '${roleTitle}' already exists.`);
      }
  } catch (err) {
      console.error('Error adding role:', err);
  }

  // Show the main menu again after adding the role
  mainMenu();
}

async function viewDepartments() {
  try {
      // Query to fetch all departments
      const result = await pool.query(`
          SELECT id, name
          FROM departments
          ORDER BY name;
      `);

      const departments = result.rows;

      // Check if there are any departments
      if (departments.length === 0) {
          console.log('No departments found.');
      } else {
          // Display department details in a table format
          console.table(departments, ['id', 'name']);
      }
  } catch (err) {
      console.error('Error viewing departments:', err);
  }

  // Show the main menu again after displaying departments
  mainMenu();
}

async function viewEmployees() {
  try {
      // Query to fetch all employees
      const result = await pool.query(`
          SELECT e.id, e.first_name, e.last_name, r.title AS role, d.name AS department, 
                 e.manager_id 
          FROM employee e
          JOIN roles r ON e.roles_id = r.id
          JOIN departments d ON r.departments_id = d.id
          ORDER BY e.last_name, e.first_name;
      `);

      const employees = result.rows;

      // Check if there are any employees
      if (employees.length === 0) {
          console.log('No employees found.');
      } else {
          // Display employee details in a table format
          console.table(employees, ['id', 'first_name', 'last_name', 'role', 'department', 'manager_id']);
      }
  } catch (err) {
      console.error('Error viewing employees:', err);
  }

  // Show the main menu again after displaying employees
  mainMenu();
}

async function viewRoles() {
  try {
      // Query to fetch all roles with department information
      const result = await pool.query(`
          SELECT roles.id, roles.title, roles.salary, departments.name AS department
          FROM roles
          JOIN departments ON roles.departments_id = departments.id
          ORDER BY roles.title;
      `);

      const roles = result.rows;

      // Check if there are any roles
      if (roles.length === 0) {
          console.log('No roles found.');
      } else {
          // Display role details in a table format
          console.table(roles, ['id', 'title', 'salary', 'department']);
      }
  } catch (err) {
      console.error('Error viewing roles:', err);
  }

  // Show the main menu again after displaying roles
  mainMenu();
}

async function deleteDepartment() {
  try {
      // Fetch all departments to show user options
      const result = await pool.query('SELECT id, name FROM departments ORDER BY name;');
      const departments = result.rows;

      // Check if there are any departments
      if (departments.length === 0) {
          console.log('No departments found.');
          mainMenu();
          return;
      }

      // Prompt user to select a department to delete
      const answers = await inquirer.prompt({
          type: 'list',
          name: 'departmentId',
          message: 'Select a department to delete:',
          choices: departments.map(dept => ({ name: dept.name, value: dept.id }))
      });

      // Delete the selected department
      await pool.query('DELETE FROM departments WHERE id = $1;', [answers.departmentId]);

      console.log('Department deleted successfully.');

  } catch (err) {
      console.error('Error deleting department:', err);
  }

  // Show the main menu again after deleting the department
  mainMenu();
}

async function deleteEmployee() {
  try {
      // Fetch all employees to show user options
      const result = await pool.query('SELECT id, first_name, last_name FROM employee ORDER BY last_name, first_name;');
      const employees = result.rows;

      // Check if there are any employees
      if (employees.length === 0) {
          console.log('No employees found.');
          mainMenu();
          return;
      }

      // Prompt user to select an employee to delete
      const answers = await inquirer.prompt({
          type: 'list',
          name: 'employeeId',
          message: 'Select an employee to delete:',
          choices: employees.map(emp => ({ name: `${emp.first_name} ${emp.last_name}`, value: emp.id }))
      });

      // Delete the selected employee
      await pool.query('DELETE FROM employee WHERE id = $1;', [answers.employeeId]);

      console.log('Employee deleted successfully.');

  } catch (err) {
      console.error('Error deleting employee:', err);
  }

  // Show the main menu again after deleting the employee
  mainMenu();
}

async function deleteRole() {
  try {
      // Fetch all roles to show user options
      const result = await pool.query('SELECT id, title FROM roles ORDER BY title;');
      const roles = result.rows;

      // Check if there are any roles
      if (roles.length === 0) {
          console.log('No roles found.');
          mainMenu();
          return;
      }

      // Prompt user to select a role to delete
      const answers = await inquirer.prompt({
          type: 'list',
          name: 'roleId',
          message: 'Select a role to delete:',
          choices: roles.map(role => ({ name: role.title, value: role.id }))
      });

      // Check if the selected role is assigned to any employees
      const employeesResult = await pool.query('SELECT id FROM employee WHERE roles_id = $1;', [answers.roleId]);
      if (employeesResult.rows.length > 0) {
          console.log('Cannot delete this role because it is assigned to one or more employees.');
          mainMenu();
          return;
      }

      // Delete the selected role
      await pool.query('DELETE FROM roles WHERE id = $1;', [answers.roleId]);

      console.log('Role deleted successfully.');

  } catch (err) {
      console.error('Error deleting role:', err);
  }

  // Show the main menu again after deleting the role
  mainMenu();
}


  function mainMenu() {
    inquirer
      .prompt({
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: ['Add Employee', 'Add Department', 'Add Role', 'View Departments', 'View Employees', 'View Roles', 'Delete a Department', 'Delete Employee', 'Delete Role', 'Load SQL Schema', 'Load SQL Seeds', 'Exit'],
      })
      .then((answers) => {
        switch (answers.action) {
          case 'Add Employee':
            addEmployee();
            break;
          case 'Add Department':
            addDepartment();
            break;
          case 'Add Role':
            addRole();
            break;
          case 'View Departments':
            viewDepartments();
            break;
          case 'View Employees':
            viewEmployees();
            break;
          case 'View Roles':
            viewRoles();
            break;
          case 'Delete a Department':
            deleteDepartment()
            break;
          case 'Delete Employee':
            deleteEmployee();
            break;
          case 'Delete Role':
            deleteRole();
            break;
          case 'Load SQL Schema':
            executeSQLFile('schema.sql');
            break;
          case 'Load SQL Seeds':
            executeSQLFile('seeds.sql');
            break;
          default:
            pool.end();
            process.exit();
        }
      });
  }