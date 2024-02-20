import { useFormStatus } from "react-dom"

export default function FormSubmit() {
    const { pending } = useFormStatus()

    return (
        <div id="qr-submit-cntr" className="QRL-container QRL-create">
            <button type="submit" disabled={pending} id="qr-submit" className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800 disabled:text-white disabled:bg-blue-300 disabled:hover:bg-blue-300">{pending ? "Creating..." : "Create"}</button>
        </div>
    )
}