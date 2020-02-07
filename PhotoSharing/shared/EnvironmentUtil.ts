export function isRunningLocally(): boolean {
    return !!process.env.IS_OFFLINE;
}
