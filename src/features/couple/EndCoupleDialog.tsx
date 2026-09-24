import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { repo } from '@/lib/data'
import { useViewerMutation } from './hooks'

export function EndCoupleDialog({ partnerName }: { partnerName: string }) {
  const end = useViewerMutation<void>((viewerId) => repo.endCouple(viewerId), {
    success: () => 'Your couple link has ended.',
  })

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="outline" />}>End our couple</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>End your couple with {partnerName}?</AlertDialogTitle>
          <AlertDialogDescription render={<div />}>
            <ul className="list-disc space-y-1 pl-5 text-left">
              <li>Your private reflections stay yours.</li>
              <li>Things you shared become visible only to you. The same goes for {partnerName}.</li>
              <li>This can't be undone. You can link again later with a new request.</li>
            </ul>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={end.isPending} onClick={() => end.mutate()}>
            End couple
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
