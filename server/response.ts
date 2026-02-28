export interface Response {
    text: string;
    time: Date;
    agent?: string;
    notify: boolean;
    echo: string;
}