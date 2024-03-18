"use client";

import Swal from 'sweetalert2-ql';
import "@sweetalert2/theme-dark"


export default function AddAPIKeyButton({
    createAPIKey
}:{
    createAPIKey: (data:{name:string,permissions:string[]}) => void
}) {

    const permissionsTooltipMap = {
        "api:delete-self": "Allows the API key to delete itself",
        "api:update-self": "Allows the API key to update it's own name",
        "qrcode:create": "Allows the API key to create QR codes on behalf of the user",
        "qrcode:update": "Allows the API key to update QR codes on behalf of the user",
        "qrcode:delete": "Allows the API key to delete QR codes on behalf of the user",
        "qrcode:read": "Allows the API key to view QR codes on the user's account"
    }

    function showAPIKeyGenerator() {
        Swal.fire({
            title: 'Add API Key',

            html: `
            <div class="flex items-center flex-col">
                <label for="name" class="text-lg font-medium text-gray-300">Name</label>
                <input type="text" id="name" placeholder="Name (optional)" class="swal2-input placeholder:text-gray-500" style="margin-top:5px">
                
                <br>
                <br>
                <label for="permissions" class="text-lg font-medium text-gray-300">Permissions</label>
                <div id="permissions" name="permissions" style="min-height:fit-content;border:1px solid gray;border-radius:8px;display: flex;justify-content: center;align-items: center;padding: 10px;flex-wrap:wrap; gap:5px;">
                    <span style="transition:.1s" name="permissions" data-perm-key="api:delete-self" title="${permissionsTooltipMap["api:delete-self"]}" aria-disabled=true class="cursor-pointer select-none whitespace-nowrap text-xs font-medium me-2 px-2.5 py-0.5 rounded-full bg-blue-900 text-blue-300 [&[aria-disabled=true]]:bg-gray-700 [&[aria-disabled=true]]:text-gray-500" onclick="javascript:this.ariaDisabled = this.ariaDisabled == 'false'">api:delete-self</span>
                    <span style="transition:.1s" name="permissions" data-perm-key="api:update-self" title="${permissionsTooltipMap["api:update-self"]}" aria-disabled=true class="cursor-pointer select-none whitespace-nowrap text-xs font-medium me-2 px-2.5 py-0.5 rounded-full bg-blue-900 text-blue-300 [&[aria-disabled=true]]:bg-gray-700 [&[aria-disabled=true]]:text-gray-500" onclick="javascript:this.ariaDisabled = this.ariaDisabled == 'false'">api:update-self</span>
                    <span style="transition:.1s" name="permissions" data-perm-key="qrcode:create" title="${permissionsTooltipMap["qrcode:create"]}" aria-disabled=true class="cursor-pointer select-none whitespace-nowrap text-xs font-medium me-2 px-2.5 py-0.5 rounded-full bg-blue-900 text-blue-300 [&[aria-disabled=true]]:bg-gray-700 [&[aria-disabled=true]]:text-gray-500" onclick="javascript:this.ariaDisabled = this.ariaDisabled == 'false'">qrcode:create</span>
                    <span style="transition:.1s" name="permissions" data-perm-key="qrcode:update" title="${permissionsTooltipMap["qrcode:update"]}" aria-disabled=true class="cursor-pointer select-none whitespace-nowrap text-xs font-medium me-2 px-2.5 py-0.5 rounded-full bg-blue-900 text-blue-300 [&[aria-disabled=true]]:bg-gray-700 [&[aria-disabled=true]]:text-gray-500" onclick="javascript:this.ariaDisabled = this.ariaDisabled == 'false'">qrcode:update</span>
                    <span style="transition:.1s" name="permissions" data-perm-key="qrcode:delete" title="${permissionsTooltipMap["qrcode:delete"]}" aria-disabled=true class="cursor-pointer select-none whitespace-nowrap text-xs font-medium me-2 px-2.5 py-0.5 rounded-full bg-blue-900 text-blue-300 [&[aria-disabled=true]]:bg-gray-700 [&[aria-disabled=true]]:text-gray-500" onclick="javascript:this.ariaDisabled = this.ariaDisabled == 'false'">qrcode:delete</span>
                    <span style="transition:.1s" name="permissions" data-perm-key="qrcode:read" title="${permissionsTooltipMap["qrcode:read"]}" aria-disabled=true class="cursor-pointer select-none whitespace-nowrap text-xs font-medium me-2 px-2.5 py-0.5 rounded-full bg-blue-900 text-blue-300 [&[aria-disabled=true]]:bg-gray-700 [&[aria-disabled=true]]:text-gray-500" onclick="javascript:this.ariaDisabled = this.ariaDisabled == 'false'">qrcode:read</span>
                </div>
            </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Add',
            cancelButtonText: 'Cancel',
            preConfirm: async () => {
                const name = (document.getElementById('name') as HTMLInputElement).value;

                const permissions = Array.from(document.querySelectorAll("[name=permissions]")) as unknown as HTMLSpanElement[];
                const selectedPermissions = permissions.filter(permission => permission.ariaDisabled === "false").map(permission => permission.dataset.permKey);

                if (name.length > 75) {
                    return Swal.showValidationMessage("Name too long, must be 75 characters or less.")
                }

                if (selectedPermissions.length === 0) {
                    return Swal.showValidationMessage("At least one permission is required.")
                }


                const result: {
                    error?: string,
                    message?: string,
                    id: string,
                    name: string,
                    permissions: string[]
                    token: string,
                    created: string,
                    last_used: string,
                
                } = (await createAPIKey({
                    name,
                    permissions: selectedPermissions
                })) as any

                if (result.error) {
                    return Swal.showValidationMessage(result.message)
                }

                const token = result.token;

                Swal.fire({
                    title: "API Key created",
                    html: `
                        Your API key has been created! Here is it's token:
                        <br>
                        <br>
                        <code>${token}</code>
                        <br>
                        <button id='copy-api-key' class='bg-blue-900 text-blue-300 px-2.5 py-0.5 rounded-lg mt-2 cursor-pointer' onclick='javascript:navigator.clipboard.writeText("${token}");this.innerText="Copied!"'>Click to Copy</button>
                        <br>
                        <br>
                        <b>Make sure to copy this key now, as it will not be shown again.</b>`,
                    icon: "success",
                    didClose: () => {
                        window.dispatchEvent(new CustomEvent("addToAPIKeys", {
                            detail: {
                                id: result.id,
                                name: result.name,
                                permissions: result.permissions,
                                token_preview: token.substring(0, 7) + "..." + token.substring(token.length - 7, token.length),
                                created: result.created,
                                last_used: result.last_used
                            }
                        }))
                    }
                })

                return
            }
        })
    }

    return (
        <button onClick={showAPIKeyGenerator} className="user-api add-api-key">Add API Key</button>
    )
}