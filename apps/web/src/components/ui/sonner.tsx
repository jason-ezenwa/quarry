import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CheckCircleIcon } from "@phosphor-icons/react/dist/csr/CheckCircle"
import { InfoIcon } from "@phosphor-icons/react/dist/csr/Info"
import { WarningIcon } from "@phosphor-icons/react/dist/csr/Warning"
import { WarningCircleIcon } from "@phosphor-icons/react/dist/csr/WarningCircle"
import { Spinner } from "@/components/ui/spinner"

// The surface colours come from the `.toaster` variables in index.css.
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      icons={{
        success: <CheckCircleIcon className="size-4 text-success-ink" />,
        info: <InfoIcon className="size-4 text-icon" />,
        warning: <WarningIcon className="size-4 text-warning-ink" />,
        error: <WarningCircleIcon className="size-4 text-destructive-ink" />,
        loading: <Spinner />,
      }}
      toastOptions={{
        classNames: {
          toast: "cn-toast font-sans text-small",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
