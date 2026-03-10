export interface Response {
    requestId: string;
    text: string;
    time: Date;
    agent?: string;
    notify: boolean;
    echo?: string;
}