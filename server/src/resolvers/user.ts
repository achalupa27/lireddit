import { User } from '../entities/User';
import { MyContext } from '../types';
import { Arg, Ctx, Field, FieldResolver, Mutation, ObjectType, Query, Resolver, Root } from 'type-graphql';
import argon2 from 'argon2';
import { COOKIE_NAME, FORGOT_PASSWORD_PREFIX } from '../constants';
import { UsernamePasswordInput } from './UsernamePasswordInput';
import { validateRegister } from '../utils/validateRegister';
import { sendEmail } from '../utils/sendEmail';
import { v4 } from 'uuid';
import { getConnection } from 'typeorm';

// something wrong with a particular field
@ObjectType()
class FieldError {
    @Field()
    field: string; // the field with the password

    @Field()
    message: string; // whats wrong with the field
}

@ObjectType() // ObjectType is returned from mutations
class UserResponse {
    @Field(() => [FieldError], { nullable: true })
    errors?: FieldError[];

    @Field(() => User, { nullable: true })
    user?: User;
}

@Resolver(User)
export class UserResolver {
    @FieldResolver(() => String)
    email(@Root() user: User, @Ctx() { req }: MyContext) {
        // this is the current user and its ok to show them their own email
        if (req.session.userId == user.id) {
            return user.email;
        }
        // current user wants to see someone elses email
        return '';
    }

    @Mutation(() => UserResponse)
    async changePassword(@Arg('token') token: string, @Arg('newPassword') newPassword: string, @Ctx() { redis, req }: MyContext): Promise<UserResponse> {
        if (newPassword.length <= 2) {
            return {
                errors: [
                    {
                        field: 'newPassword',
                        message: 'length must be greater than 2',
                    },
                ],
            };
        }

        const key = FORGOT_PASSWORD_PREFIX + token;
        const userId = await redis.get(key);
        if (!userId) {
            return {
                errors: [
                    {
                        field: 'token',
                        message: 'Token expired.',
                    },
                ],
            };
        }
        const userIdNum = parseInt(userId);
        const user = await User.findOne({ where: { id: userIdNum } });

        if (!user) {
            return {
                errors: [
                    {
                        field: 'token',
                        message: 'User no longer exists.',
                    },
                ],
            };
        }

        await User.update(
            { id: userIdNum },
            {
                password: await argon2.hash(newPassword),
            }
        );

        await redis.del(key);
        req.session.userId = user.id;

        return { user };
    }

    @Mutation(() => Boolean)
    async forgotPassword(@Arg('email') email: string, @Ctx() { redis }: MyContext) {
        const user = await User.findOne({ where: { email } });
        if (!user) {
            // email is not in database
            // can return true to not tell user anything
            // can return false if want to tell user that email not found in database - has security implications
            console.log('email not found');
            return true;
        }

        const token = v4();
        await redis.set(FORGOT_PASSWORD_PREFIX + token, user.id, 'EX', 1000 * 60 * 60 * 24 * 3); // 3 days

        await sendEmail(email, `<a href='` + process.env.CORS_ORIGIN + `/change-password/${token}'>Reset password</a>`);
        return true;
    }

    @Query(() => User, { nullable: true })
    me(@Ctx() { req }: MyContext) {
        if (!req.session.userId) {
            return null;
        }

        return User.findOne({ where: { id: req.session.userId } });
    }

    @Mutation(() => UserResponse)
    async register(@Arg('options') options: UsernamePasswordInput, @Ctx() { req }: MyContext): Promise<UserResponse> {
        const errors = validateRegister(options);
        if (errors) {
            return { errors };
        }

        const hashedPassword = await argon2.hash(options.password);
        let user;
        try {
            const result = await getConnection()
                .createQueryBuilder()
                .insert()
                .into(User)
                .values({
                    username: options.username,
                    email: options.email,
                    password: hashedPassword,
                })
                .returning('*')
                .execute();
            user = result.raw[0];
        } catch (err) {
            if (err.code === '23505') {
                return {
                    errors: [
                        {
                            field: 'username',
                            message: 'Username taken.',
                        },
                    ],
                };
            }
        }

        // store userId in session
        // this will set a cookie on the user to keep them logged in
        // session is stored on redis as key value
        req.session.userId = user.id;

        return { user };
    }

    @Mutation(() => UserResponse)
    async login(@Arg('usernameOrEmail') usernameOrEmail: string, @Arg('password') password: string, @Ctx() { req }: MyContext): Promise<UserResponse> {
        const user = await User.findOne(usernameOrEmail.includes('@') ? { where: { email: usernameOrEmail } } : { where: { username: usernameOrEmail } });
        if (!user) {
            return {
                errors: [
                    {
                        field: 'usernameOrEmail',
                        message: 'User does not exist.',
                    },
                ],
            };
        }

        const valid = await argon2.verify(user.password, password);
        if (!valid) {
            return {
                errors: [
                    {
                        field: 'password',
                        message: 'Incorrect password.',
                    },
                ],
            };
        }
        req.session.userId = user.id;

        return { user };
    }

    @Mutation(() => Boolean)
    logout(@Ctx() { req, res }: MyContext) {
        return new Promise((resolve) =>
            req.session.destroy((err: any) => {
                res.clearCookie(COOKIE_NAME);
                if (err) {
                    console.log(err);
                    resolve(false);
                    return;
                }

                resolve(true);
            })
        );
    }
}
