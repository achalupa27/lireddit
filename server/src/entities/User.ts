import { BaseEntity, Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Field, ObjectType } from 'type-graphql';
import { Post } from './Post';
import { Updoot } from './Updoot';

@ObjectType()
@Entity()
export class User extends BaseEntity {
    @Field() // Field exposes attribute to GraphQL schema. Include type for GraphQL
    @PrimaryGeneratedColumn()
    id!: number;

    @Field()
    @Column({ unique: true }) // unique set to ensure only one person can have a username
    username!: string;

    @Field()
    @Column({ unique: true })
    email!: string;

    @Column() // @Field() not included, so not exposed to GraphQL and cannot query
    password!: string;

    @OneToMany(() => Post, (post) => post.creator)
    posts: Post[]; // name of field (posts) should match Post entity field

    @OneToMany(() => Updoot, (updoot) => updoot.user)
    updoots: Updoot[];

    @Field(() => String)
    @CreateDateColumn()
    createdAt: Date;

    @Field(() => String)
    @UpdateDateColumn()
    updatedAt: Date;
}
