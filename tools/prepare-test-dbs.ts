import {database} from '../server/db.ts';
const pool=database(process.env.IH2_TEST_DATABASE_URL);if(new URL(process.env.IH2_TEST_DATABASE_URL!).pathname!=='/ih2_test')throw new Error('CI setup accepts only the isolated ih2_test cluster.');
try{for(const name of ['ih2_cafe_browser','ih2_http_test','ih2_browser','ih2_restore','ih2_load','ih2_neighborhood_browser'])if(!(await pool.query('select 1 from pg_database where datname=$1',[name])).rowCount)await pool.query(`create database ${name}`);}finally{await pool.end();}
