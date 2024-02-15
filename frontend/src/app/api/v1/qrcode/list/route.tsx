export async function GET(request: Request): Promise<Response> {
    console.log(request)
    const body = JSON.stringify({ message: "This is a sample file."});
    return new Response(body,{
        headers: {
            "content-type": "application/json",
        },
    });
}