export interface IFileNode {
    name: string;
    path: string;
    type: 'tree' | 'blob';
    size?: number; // bytes
    children?: IFileNode[]; // For trees

    // Metadata for visualization
    extension?: string;
    depth?: number;
    dailyChange?: number; // 0-1 activity score
    tags?: string[]; // Tag-based clustering
}
