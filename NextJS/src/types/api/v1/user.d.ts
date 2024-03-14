interface User {
    object:string,
    id:string,
    email: string,
    emailVerified: boolean,
    firstName: string | null,
    lastName: string | null,
    createdAt: Date | string,
    updatedAt: Date | string,
    profilePictureUrl: string
}