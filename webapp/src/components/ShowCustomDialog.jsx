import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Button } from 'lucide-react'

function ShowCustomDialog({ showNewBranchPopup, setShowNewBranchPopup, closeNewBranchPopup }) {
    
  return (
    <Dialog open={showNewBranchPopup} onOpenChange={setShowNewBranchPopup}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Branch Opened in Sakur!</DialogTitle>
            <DialogDescription>
              We're excited to announce that we've opened a new branch in Sakur. Visit us to learn about our expanded services!
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={closeNewBranchPopup}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
  )
}

export default ShowCustomDialog