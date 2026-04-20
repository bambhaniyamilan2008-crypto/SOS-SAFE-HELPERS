
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AppScreen } from "../SafeHelpApp";
import { 
  ArrowLeft, Plus, Edit2, Trash2, Star, User, Phone, Users,
  AlertTriangle, PhoneCall, MessageSquare, Loader2, AlertCircle,
  Save, RefreshCw
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useUser, useFirestore } from "@/firebase";
import { doc, onSnapshot, setDoc, arrayUnion } from "firebase/firestore";

interface Contact {
  id: string;
  name: string;
  phone: string;
  relation: string;
  isPrimary: boolean;
}

export default function Contacts({ navigateTo }: { navigateTo: (screen: AppScreen) => void }) {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<string | null>(null);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    phone: "+91 ",
    relation: ""
  });

  // 🔹 Real-time Synchronizer for Emergency Contacts
  useEffect(() => {
    if (!user || !db) return;

    setLoading(true);
    const docRef = doc(db, "users", user.uid);
    
    const unsubscribe = onSnapshot(docRef, 
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const fetchedContacts = data.contacts || [];
          // 🔹 Sort primary contacts to the top
          const sorted = [...fetchedContacts].sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0));
          setContacts(sorted);
        } else {
          setContacts([]);
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Firestore Snapshot Error:", err);
        setError("Network error. Could not sync contacts.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, db]);

  // 🔹 Auto-seed Milan if list is empty
  useEffect(() => {
    if (!loading && contacts.length === 0 && user && db) {
      const milan: Contact = {
        id: "default-milan-" + Date.now(),
        name: "Milan",
        phone: "+91 9586875178",
        relation: "Friend",
        isPrimary: true
      };
      const userRef = doc(db, "users", user.uid);
      setDoc(userRef, { contacts: [milan] }, { merge: true });
    }
  }, [loading, contacts.length, user, db]);

  const handleOpenAdd = () => {
    setEditingContact(null);
    setFormData({ name: "", phone: "+91 ", relation: "" });
    setIsSheetOpen(true);
  };

  const handleOpenEdit = (contact: Contact) => {
    setEditingContact(contact);
    setFormData({ name: contact.name, phone: contact.phone, relation: contact.relation });
    setIsSheetOpen(true);
  };

  const handleDelete = async () => {
    if (!user || !db || !contactToDelete) return;

    try {
      const updatedContacts = contacts.filter(c => c.id !== contactToDelete);
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, { contacts: updatedContacts }, { merge: true });
      toast({ title: "Contact removed" });
    } catch (err) {
      console.error("Delete Error:", err);
      toast({ variant: "destructive", title: "Delete Failed" });
    } finally {
      setIsAlertOpen(false);
      setContactToDelete(null);
    }
  };

  const handleTogglePrimary = async (id: string) => {
    if (!user || !db) return;
    
    const updatedContacts = contacts.map(c => 
      c.id === id ? { ...c, isPrimary: !c.isPrimary } : c
    );
    
    const userRef = doc(db, "users", user.uid);
    await setDoc(userRef, { contacts: updatedContacts }, { merge: true });
  };

  const handleSave = async () => {
    if (!user || !db) return;

    const cleanPhone = formData.phone.replace("+91 ", "").trim();
    if (!formData.name.trim() || cleanPhone.length !== 10) {
      toast({ variant: "destructive", title: "Input Error", description: "Please enter a valid name and 10-digit number." });
      return;
    }

    setIsSheetOpen(false);

    try {
      const userRef = doc(db, "users", user.uid);

      if (editingContact) {
        const updatedContacts = contacts.map(c => 
          c.id === editingContact.id 
            ? { ...c, name: formData.name, phone: formData.phone, relation: formData.relation } 
            : c
        );
        await setDoc(userRef, { contacts: updatedContacts }, { merge: true });
        toast({ title: "Contact updated" });
      } else {
        const newContact: Contact = {
          id: Date.now().toString(),
          name: formData.name,
          phone: formData.phone,
          relation: formData.relation,
          isPrimary: contacts.length === 0
        };
        await setDoc(userRef, { contacts: arrayUnion(newContact) }, { merge: true });
        toast({ title: "Contact saved" });
      }
    } catch (err) {
      console.error("Save Failed:", err);
      toast({ variant: "destructive", title: "Sync failed" });
    }
  };

  const handlePhoneInputChange = (val: string) => {
    const prefix = "+91 ";
    let clean = val;
    if (!clean.startsWith(prefix)) {
      clean = prefix + clean.replace(/^\+91\s?/, "");
    }
    const body = clean.slice(prefix.length).replace(/\D/g, "").slice(0, 10);
    setFormData(prev => ({ ...prev, phone: prefix + body }));
  };

  if (loading && contacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Syncing Secure Data...</p>
      </div>
    );
  }

  if (error && contacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center space-y-6">
        <AlertCircle className="w-16 h-16 text-destructive" />
        <h2 className="text-2xl font-bold font-headline">Sync Error</h2>
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={() => window.location.reload()} variant="outline" className="rounded-2xl h-14 px-8 border-primary text-primary">
          <RefreshCw className="mr-2 w-5 h-5" /> Retry Sync
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background p-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => navigateTo("home")} className="rounded-full bg-secondary w-12 h-12">
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-2xl font-headline font-bold">Safe Number</h1>
        </div>
        <Button variant="ghost" size="icon" onClick={handleOpenAdd} className="rounded-full bg-primary text-white w-12 h-12 glow-primary">
          <Plus className="w-6 h-6" />
        </Button>
      </div>

      <div className="flex-1 space-y-4 pb-24">
        {contacts.length > 0 ? (
          contacts.map((contact) => (
            <div key={contact.id} className={cn("bg-card border-2 rounded-[2.2rem] p-6 flex flex-col space-y-4 transition-all shadow-sm", contact.isPrimary ? "border-primary/40 bg-primary/5" : "border-border/40")}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center relative shadow-inner">
                    <User className={cn("w-8 h-8", contact.isPrimary ? "text-primary" : "text-muted-foreground")} />
                    {contact.isPrimary && (
                      <div className="absolute -top-2 -right-2 bg-primary p-1.5 rounded-full border-2 border-background shadow-lg">
                        <Star className="w-4 h-4 text-white fill-white" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-xl leading-tight">{contact.name}</h3>
                    <div className="flex items-center space-x-2 text-primary font-bold uppercase text-[10px] tracking-widest mt-0.5">
                      <span>{contact.relation}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button 
                    onClick={() => window.location.href = `tel:${contact.phone}`} 
                    variant="ghost" 
                    size="icon" 
                    className="w-12 h-12 rounded-2xl bg-green-500 text-white shadow-md active:scale-90 transition-transform"
                  >
                    <PhoneCall className="w-5 h-5" />
                  </Button>
                  <Button 
                    onClick={() => window.location.href = `sms:${contact.phone}?body=Emergency! I need help. My current location is being shared via SafeHelp.`} 
                    variant="ghost" 
                    size="icon" 
                    className="w-12 h-12 rounded-2xl bg-blue-500 text-white shadow-md active:scale-90 transition-transform"
                  >
                    <MessageSquare className="w-5 h-5" />
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-2 border-t border-border/10">
                <div className="flex items-center space-x-3 text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  <span className="text-lg font-bold">{contact.phone}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="icon" className="w-11 h-11 rounded-xl bg-secondary/50 text-accent" onClick={() => handleOpenEdit(contact)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="w-11 h-11 rounded-xl bg-secondary/50 text-destructive" onClick={() => { setContactToDelete(contact.id); setIsAlertOpen(true); }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <button onClick={() => handleTogglePrimary(contact.id)} className={cn("w-11 h-11 rounded-xl flex items-center justify-center transition-all", contact.isPrimary ? "bg-primary text-white" : "bg-secondary/50 text-muted-foreground")}>
                    <Star className={cn("w-5 h-5", contact.isPrimary && "fill-white")} />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center space-y-6">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-muted-foreground font-bold">Initializing Primary Contact...</p>
          </div>
        )}
      </div>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="bottom" className="bg-card border-t-primary/20 rounded-t-[3rem] p-8">
          <SheetHeader className="mb-8">
            <SheetTitle className="text-3xl font-headline text-left">{editingContact ? "Edit Contact" : "Add Contact"}</SheetTitle>
          </SheetHeader>
          <div className="grid gap-6 py-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-2">Full Name</label>
              <Input placeholder="Enter name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="h-16 rounded-2xl text-lg font-bold bg-secondary/20" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-2">Phone Number</label>
              <Input placeholder="+91 " value={formData.phone} onChange={(e) => handlePhoneInputChange(e.target.value)} className="h-16 rounded-2xl text-lg font-bold bg-secondary/20" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-2">Relationship</label>
              <div className="grid grid-cols-3 gap-3">
                {["Mother", "Father", "Sibling", "Friend", "Doctor", "Spouse"].map((rel) => (
                  <button 
                    key={rel} 
                    onClick={() => setFormData({ ...formData, relation: rel })} 
                    className={cn(
                      "h-12 rounded-xl font-bold border-2 transition-all text-sm", 
                      formData.relation === rel ? "bg-primary text-white border-primary shadow-lg" : "bg-secondary/40 text-foreground border-transparent"
                    )}
                  >
                    {rel}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <Button onClick={handleSave} size="lg" className="w-full h-20 text-xl rounded-[2rem] glow-primary font-bold mt-8 shadow-xl">
            <Save className="mr-2 w-6 h-6" />
            {editingContact ? "Save Changes" : "Save Contact"}
          </Button>
        </SheetContent>
      </Sheet>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent className="rounded-[2.5rem]">
          <AlertDialogHeader className="items-center">
            <div className="p-4 bg-destructive/10 rounded-full mb-4">
              <AlertTriangle className="text-destructive w-12 h-12" />
            </div>
            <AlertDialogTitle className="text-2xl font-headline text-center">Remove Contact?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2">
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90 h-14 rounded-2xl text-lg font-bold">Delete</AlertDialogAction>
            <AlertDialogCancel className="h-14 rounded-2xl text-lg font-bold border-none bg-secondary">Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
