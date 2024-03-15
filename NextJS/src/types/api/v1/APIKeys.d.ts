interface APIKeys {
    [key: string]: APIKey
}
interface APIKey {
    id?: string;
    key: string;
    name: string;
    belongs_to: string;
    permissions: [APIKeyPermissions]
    created: string;
    last_used: string;
}

type APIKeyPermissions = "qrcode:read" | "qrcode:create" | "qrcode:update" | "qrcode:delete" | "api:update-self" | "api:delete-self"