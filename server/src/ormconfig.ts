import { DataSource } from 'typeorm';

const AppDataSource = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'postgres',
    password: 'postgres',
    database: 'lireddit2',
    entities: ['dist/entities/*.js'],
    migrations: ['dist/migrations/*.js'],
});

export default AppDataSource;
