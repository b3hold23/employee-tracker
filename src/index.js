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

async function loadDataBase() {
    await executeSQLFile('schema.sql');
    await executeSQLFile('seeds.sql');
}

loadDataBase().then(() => {
    mainMenu();
}).catch(err => console.error('Error initializing database', err));

  function mainMenu() {
    inquirer
      .prompt({
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: ['Add Employee', 'View Employees', 'Delete Employee', 'Load SQL Schema', 'Load SQL Seeds', 'Exit'],
      })
      .then((answers) => {
        switch (answers.action) {
          case 'Add Employee':
            addEmployee();
            break;
          case 'View Employees':
            viewEmployees();
            break;
          case 'Delete Employee':
            deleteEmployee();
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
  
  mainMenu();