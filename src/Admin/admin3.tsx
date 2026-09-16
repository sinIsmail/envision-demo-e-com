

// shadcn/ui components (Adjust import paths based on your project configuration)
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

import { Label } from "@/components/ui/label";


export default function Done(){
  return(
     
<div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
  <Card className="w-full max-w-2xl shadow-xl">
    
    <CardHeader className="items-center text-center py-8">
      <CardTitle className="text-4xl font-bold text-white-600">
        Successful
      </CardTitle>
    </CardHeader>

    <CardContent className="space-y-8 px-8 pb-10">

      {/* Progress / Status Bar */}
      <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
        <div className="h-full w-full rounded-full bg-white" />
      </div>

      {/* Status */}
      <div className="grid grid-cols-2 gap-6">

        <div className="rounded-xl bg-green-50 p-6 text-center">
          <Label className="text-lg font-medium text-black">
            Status
          </Label>

          <p className="mt-2 text-2xl font-bold text-black">
            Done
          </p>
        </div>

        <div className="rounded-xl bg-green-50 p-6 text-center">
          <Label className="text-lg font-medium text-black">
            Upload
          </Label>

          <p className="mt-2 text-2xl font-bold text-black">
            Done
          </p>
        </div>

      </div>

      {/* Bottom Status Bar */}
      <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
        <div className="h-full w-full rounded-full bg-green-500" />
      </div>

    </CardContent>

    <CardFooter className="justify-center pb-8">
      {/* Button can go here */}
    </CardFooter>

  </Card>
</div>

  )
  }