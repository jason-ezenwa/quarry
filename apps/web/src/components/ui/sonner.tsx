import { Toaster as Sonner, type ToasterProps } from "sonner"
import CircleCheckIcon from "lucide-react/icons/circle-check"
import InfoIcon from "lucide-react/icons/info"
import Loader2Icon from "lucide-react/icons/loader-circle"
import OctagonXIcon from "lucide-react/icons/octagon-x"
import TriangleAlertIcon from "lucide-react/icons/triangle-alert"

// The surface colours come from the `.toaster` variables in index.css.
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
