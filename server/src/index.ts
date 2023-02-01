import 'reflect-metadata'; // type-graphql dependency
import 'dotenv-safe/config';
import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import { buildSchema } from 'type-graphql';
import { MyContext } from './types';
import { HelloResolver } from './resolvers/hello';
import { PostResolver } from './resolvers/post';
import { UserResolver } from './resolvers/user';
import { COOKIE_NAME, __prod__ } from './constants';
import Redis from 'ioredis';
import session from 'express-session';
import cors from 'cors';
import { createConnection } from 'typeorm';
import { Post } from './entities/Post';
import { User } from './entities/User';
import path from 'path';
import { Updoot } from './entities/Updoot';
import { createUserLoader } from './utils/createUserLoader';
import { createUpdootLoader } from './utils/createUpdootLoader';

const main = async () => {
    const conn = await createConnection({
        type: 'postgres',
        /*database: 'lireddit2',
        username: 'postgres',
        password: 'postgres',*/
        url: process.env.DATABASE_URL,
        logging: true,
        //synchronize: true, // turn off in production; want to be very specific about sql generating and altering tables
        migrations: [path.join(__dirname, './migrations/*')],
        entities: [Post, User, Updoot],
    });

    await conn.runMigrations();
    //wait Post.delete({});

    const app = express(); // Init server

    const RedisStore = require('connect-redis')(session);
    const redis = new Redis(/*process.env.REDIS_URL*/); // Connect to redis

    //x-forwarded-proto https
    app.set('trust proxy', 1); // for apollo studio cookies // since nginx is sitting infront of api, need to tell nginx we have a proxy sitting in front so cookies/sessions work

    app.use(
        cors({
            credentials: true,
            origin: process.env.CORS_ORIGIN,
            //origin: ['https://studio.apollographql.com', 'http://localhost:3000', 'http://localhost:4000', 'http://localhost:4000/graphql'],
        })
    );

    // set the session
    app.use(
        // session middleware runs before apollo middleware - order matters
        session({
            name: COOKIE_NAME,
            saveUninitialized: false,
            store: new RedisStore({ client: redis }), //tells express session we are using redis, disableTouch disables refresh on TTL reducing total requests
            cookie: {
                maxAge: 1000 * 60 * 60 * 24 * 365 * 10, // 10 years
                httpOnly: true, // good for security: cannot access cookie in frontend js
                sameSite: 'lax', // csrf // use 'none' for apollo studio, lax for localhost
                secure: __prod__, // cookie only works in https; // use true for apollo studio, __prod__ for localhost
                domain: __prod__ ? '.algotut.io' : undefined,
            },
            secret: process.env.SESSION_SECRET, // how cookies is signed, usually want to hide
            resave: false,
        })
    );

    // Create GraphQL endpoint (Apollo Server) on express
    const apolloServer = new ApolloServer({
        schema: await buildSchema({
            resolvers: [UserResolver, PostResolver, HelloResolver],
            validate: false,
        }),
        // can access session by passing in req and res
        context: ({ req, res }): MyContext => ({ req, res, redis, userLoader: createUserLoader(), updootLoader: createUpdootLoader() }), // context is a special object accessible by all resolvers
    });

    await apolloServer.start(); // Start the Apollo Server
    apolloServer.applyMiddleware({ app, cors: false }); // Bind the Apollo Server to Express Server

    // Start Express Server
    app.listen(parseInt(process.env.PORT));
};

main().catch((err) => {
    console.error(err);
});
