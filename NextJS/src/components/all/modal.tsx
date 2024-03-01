'use client'
 
import Link from 'next/link'
 
export function Modal({ children, backURL }: { children: React.ReactNode, backURL: string}) {
    // const [disableClose, setDisableClose] = useState(false)
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
      <div className="p-8 border min-w-96 w-auto shadow-lg rounded-md bg-white">
        <div className="text-center">
            {children} 
        </div>
          <div className="flex justify-center mt-4">

            {/* Navigates back to the base URL - closing the modal */}
            <Link
              id="closeModal"
              href={backURL}
              className="px-4 py-2 bg-blue-500 text-white text-base font-medium rounded-md shadow-sm hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              Close
            </Link>

          </div>
      </div>
    </div>
  )
}