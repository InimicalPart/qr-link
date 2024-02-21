import { useFormStatus } from "react-dom"

export default function FormSubmit({
    state
}: {
    state: any
}) {
    const { pending } = useFormStatus()

    return (
        <div id="qr-submit-cntr" className="QRL-container QRL-create">
            <p className="qr-info-label flex justify-center items-center flex-wrap" style={{
                fontSize: "11pt",
                color: "red",
                display: state?.submit_button ? "block" : "none",
                marginBottom: 5
            }}>{state?.submit_button}</p>
            <button type="submit" disabled={pending} id="qr-submit" className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800 disabled:text-white disabled:bg-blue-300 disabled:hover:bg-blue-300">{pending ? "Creating..." : "Create"}</button>
        </div>
    )
}