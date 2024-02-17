// app/callback/route.js
import { NextRequest, NextResponse } from 'next/server';
import { WorkOS } from '@workos-inc/node';
import { SignJWT } from 'jose';

// Get secret
const secret = new Uint8Array(
  Buffer.from(process.env.JWT_SECRET, 'base64'),
);

const workos = new WorkOS(process.env.WORKOS_API_KEY);
const clientId = process.env.WORKOS_CLIENT_ID;

export async function GET(req: NextRequest) {
  // The authorization code returned by AuthKit
  const code = req.nextUrl.searchParams.get('code');

  const { user } = await workos.userManagement.authenticateWithCode({
    code,
    clientId,
  });

  // Cleanup params and redirect to homepage
    const response = NextResponse.redirect(new URL('/dashboard', process.env.BASE_URL))

  // Create a JWT with the user's information
  const token = await new SignJWT({
    // Here you might lookup and retrieve user details from your database
    user,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime('1w')
    .sign(secret);


  // Store in a cookie
  response.cookies.set({
    name: 'token',
    value: token,
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'lax',

  });

  return response;
}
