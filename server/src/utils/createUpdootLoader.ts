import DataLoader from 'dataloader';
import { Updoot } from '../entities/Updoot';

// in this case they key is an object
// we pass the key and return Updoot entity
export const createUpdootLoader = () =>
    new DataLoader<{ postId: number; userId: number }, Updoot | null>(async (keys) => {
        const updoots = await Updoot.findByIds(keys as any);
        const updootIdsToUpdoot: Record<string, Updoot> = {};

        updoots.forEach((updoot) => (updootIdsToUpdoot[`${updoot.userId}|${updoot.postId}`] = updoot));

        return keys.map((key) => updootIdsToUpdoot[`${key.userId}|${key.postId}`]);
    });
