import DataLoader from 'dataloader';
import { User } from '../entities/User';

// dataloader expects key and returns values for those keys
// ex: key is id and returns the user for that id
export const createUserLoader = () =>
    new DataLoader<number, User>(async (userIds) => {
        const users = await User.findByIds(userIds as number[]);
        const userIdToUser: Record<number, User> = {};

        users.forEach((u) => (userIdToUser[u.id] = u));

        return userIds.map((userId) => userIdToUser[userId]);
    });
