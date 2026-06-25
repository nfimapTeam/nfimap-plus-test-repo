import { useToast as useChakraToast, UseToastOptions } from "@chakra-ui/react";
import { useCallback } from "react";

export function useToast(options?: UseToastOptions) {
  const chakraToast = useChakraToast(options);

  const toast = useCallback(
    (inlineOptions?: UseToastOptions) => {
      const toastId = inlineOptions?.id || "global-toast";
      const finalOptions = {
        id: toastId,
        ...inlineOptions,
      };

      if (chakraToast.isActive(toastId)) {
        chakraToast.update(toastId, finalOptions);
      } else {
        chakraToast.closeAll();
        chakraToast(finalOptions);
      }
      return toastId;
    },
    [chakraToast]
  ) as ReturnType<typeof useChakraToast>;

  toast.close = chakraToast.close;
  toast.closeAll = chakraToast.closeAll;
  toast.update = chakraToast.update;
  toast.isActive = chakraToast.isActive;

  return toast;
}
