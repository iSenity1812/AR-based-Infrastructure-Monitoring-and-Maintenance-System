export declare abstract class BaseResponse<T> {
    data: T;
    meta?: Record<string, any>;
    requestId?: string;
}
