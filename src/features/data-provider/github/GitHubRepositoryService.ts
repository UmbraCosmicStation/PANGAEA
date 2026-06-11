import type { IFileNode, IRepositoryService } from '../types';

interface GitHubTreeItem {
    path: string;
    mode: string;
    type: 'blob' | 'tree';
    sha: string;
    size?: number; // size is only present for blobs
    url: string;
}

interface GitHubTreeResponse {
    sha: string;
    url: string;
    tree: GitHubTreeItem[];
    truncated: boolean;
}

export class GitHubRepositoryService implements IRepositoryService {
    private owner: string;
    private repo: string;
    private baseUrl = 'https://api.github.com';
    private token?: string;

    constructor(owner: string, repo: string, token?: string) {
        this.owner = owner;
        this.repo = repo;
        this.token = token;
    }

    async getRoot(): Promise<IFileNode[]> {
        return this.fetchRecursiveTree();
    }

    async getContents(path: string): Promise<IFileNode[]> {
        return [];
    }

    private async fetchRecursiveTree(): Promise<IFileNode[]> {
        // Use HEAD to get the latest commit's tree recursively
        const url = `${this.baseUrl}/repos/${this.owner}/${this.repo}/git/trees/HEAD?recursive=1`;
        const headers: HeadersInit = {
            'Accept': 'application/vnd.github.v3+json',
        };

        if (this.token) {
            headers['Authorization'] = `token ${this.token}`;
        }

        try {
            const response = await fetch(url, { headers });

            if (!response.ok) {
                if (response.status === 403) {
                    console.error('GitHub API Rate Limit Exceeded');
                }
                throw new Error(`GitHub API Error: ${response.status} ${response.statusText}`);
            }

            const data: GitHubTreeResponse = await response.json();

            if (data.truncated) {
                console.warn('GitHub Repository is too large, tree truncated.');
            }

            return data.tree.map(item => this.mapTreeItemToNode(item));

        } catch (error) {
            console.error('Failed to fetch GitHub tree:', error);
            return [];
        }
    }

    private mapTreeItemToNode(item: GitHubTreeItem): IFileNode {
        // Tag Logic: Extract top-level folder
        // path: "src/core/engine/IsoEngine.ts" -> tags: ["src", "TS"]

        const pathParts = item.path.split('/');
        let primaryTag = 'Root';

        if (pathParts.length > 1) {
            // Use the first directory as the primary cluster tag
            primaryTag = pathParts[0];
        }

        const extension = item.path.includes('.') ? item.path.split('.').pop()?.toUpperCase() : 'MISC';

        return {
            id: item.sha,
            path: item.path,
            name: pathParts[pathParts.length - 1], // filename
            type: item.type === 'tree' ? 'dir' : 'file',
            size: item.size || 1000, // Directories don't have size in Tree API, default to small

            // Inferred Metadata
            dailyChange: Math.random() > 0.8 ? Math.floor(Math.random() * 5000) : 0,
            tags: [primaryTag, extension || 'FILE'],
            lastModified: new Date(),
            children: undefined // Flat structure
        };
    }
}
