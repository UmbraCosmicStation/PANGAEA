import type { IFileNode } from '../types';

export class MockRepositoryService {
    async getRoot(): Promise<IFileNode[]> {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));

        return this.generateMockTree(3, 5); // Depth 3, max 5 children
    }

    private generateMockTree(depth: number, maxChildren: number): IFileNode[] {
        if (depth === 0) return [];

        const count = Math.floor(Math.random() * maxChildren) + 1;
        const nodes: IFileNode[] = [];

        const TAG_POOL = ['UI', 'Core', 'Data', 'Utils', 'Api'];

        for (let i = 0; i < count; i++) {
            const isDir = Math.random() > 0.5;
            const name = isDir ? `dir_${depth}_${i}` : `file_${depth}_${i}`;

            // Assign 1 or 2 tags randomly
            const tags: string[] = [];
            const tagCount = Math.random() > 0.8 ? 2 : 1; // 20% dual tags (Bridges)
            for (let t = 0; t < tagCount; t++) {
                const tag = TAG_POOL[Math.floor(Math.random() * TAG_POOL.length)];
                if (!tags.includes(tag)) tags.push(tag);
            }

            const node: IFileNode = {
                name,
                path: `/mock/${depth}/${i}`,
                type: isDir ? 'tree' : 'blob',
                size: Math.random() * 10 * 1024 * 1024,
                dailyChange: Math.random(),
                depth: 3 - depth,
                tags: tags
            };

            if (isDir) {
                node.children = this.generateMockTree(depth - 1, maxChildren);
            }

            nodes.push(node);
        }

        return nodes;
    }
}
