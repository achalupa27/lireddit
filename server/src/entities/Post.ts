import { Field, Int, ObjectType } from 'type-graphql';
import { BaseEntity, Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Updoot } from './Updoot';
import { User } from './User';

@ObjectType()
@Entity()
export class Post extends BaseEntity {
    //BaseEntity allows us to use easier commands like Post.insert()
    @Field() // Field exposes attribute to GraphQL schema. Include type for GraphQL: some types inferred (int, string) so no need to specify
    @PrimaryGeneratedColumn()
    id!: number;

    @Field()
    @Column()
    title!: string;

    @Field()
    @Column()
    text!: string;

    @Field()
    @Column({ type: 'int', default: 0 })
    points!: number;

    @Field(() => Int, { nullable: true })
    voteStatus: number | null;

    @Field()
    @Column()
    creatorId!: number;

    @Field()
    @ManyToOne(() => User, (user) => user.posts) // this is the field that should match (posts)
    creator: User;

    @OneToMany(() => Updoot, (updoot) => updoot.post)
    updoots: Updoot[];

    @Field(() => String)
    @CreateDateColumn()
    createdAt: Date;

    @Field(() => String)
    @UpdateDateColumn()
    updatedAt: Date;
}
