import {useEffect, useState} from 'react'
import {BookMarked, FolderPlus} from 'lucide-react'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {main} from '../../wailsjs/go/models'

interface SaveRequestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  collections: main.Collection[]
  defaultName: string
  onSave: (name: string, collectionId: string) => void
  onCreateCollection: (name: string) => Promise<string>
}

export function SaveRequestDialog({
  open,
  onOpenChange,
  collections,
  defaultName,
  onSave,
  onCreateCollection,
}: SaveRequestDialogProps) {
  const [name, setName] = useState(defaultName)
  const [collectionId, setCollectionId] = useState(collections[0]?.id ?? '')
  const [creatingNew, setCreatingNew] = useState(collections.length === 0)
  const [newColName, setNewColName] = useState('')

  // Reset fields whenever the dialog opens. Driven by `open` rather than the Radix
  // onOpenChange callback, because opening is controlled by the parent (the sidebar
  // button) and so onOpenChange does not fire on open.
  useEffect(() => {
    if (open) {
      setName(defaultName)
      setCollectionId(collections[0]?.id ?? '')
      setCreatingNew(collections.length === 0)
      setNewColName('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleSave = async () => {
    const reqName = name.trim() || defaultName
    let targetId = collectionId

    if (creatingNew) {
      const colName = newColName.trim()
      if (!colName) return
      targetId = await onCreateCollection(colName)
      setCreatingNew(false)
    }

    if (!targetId) return
    onSave(reqName, targetId)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookMarked className="h-4 w-4 text-primary" />
            Save Request
          </DialogTitle>
          <DialogDescription>
            Give this request a name and choose a collection.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 p-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="req-name" className="text-xs">
              Name
            </Label>
            <Input
              id="req-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Get users"
            />
          </div>

          {!creatingNew ? (
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Collection</Label>
              {collections.length > 0 ? (
                <div className="flex items-center gap-2">
                  <Select value={collectionId} onValueChange={setCollectionId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select collection" />
                    </SelectTrigger>
                    <SelectContent>
                      {collections.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCreatingNew(true)}
                    aria-label="New collection"
                  >
                    <FolderPlus className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="flex-1 text-xs italic text-muted-foreground">
                    No collections yet
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCreatingNew(true)}
                    className="gap-1.5"
                  >
                    <FolderPlus className="h-3.5 w-3.5" />
                    New
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-col" className="text-xs">
                New collection name
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="new-col"
                  autoFocus
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  placeholder="e.g. My API"
                  onKeyDown={(e) => e.key === 'Escape' && setCreatingNew(false)}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCreatingNew(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim() && !defaultName}
          >
            <BookMarked className="mr-1.5 h-3.5 w-3.5" />
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
