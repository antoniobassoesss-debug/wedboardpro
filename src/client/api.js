export async function askAssistant(message) {
    const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
    });
    if (!response.ok) {
        const details = await response.json().catch(() => ({}));
        const reason = typeof details?.error === 'string'
            ? details.error
            : `Assistant request failed with status ${response.status}`;
        throw new Error(reason);
    }
    const data = (await response.json());
    return data;
}
//# sourceMappingURL=api.js.map