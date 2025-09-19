import { Inngest } from "inngest";
import connectDB from "./db";
import User from "@/models/User";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "quickcart-next" });

// Inngest function to save user daata to ddatabase
export const syncUserCreation = inngest.createFunction(
    {
        id: 'sync-user-from-clerk'
    },
    { event: 'clerk/user.created' },
    async ({ event }) => {
        try {
            console.log('Processing user creation:', event.data.id);
            
            const { id, first_name, last_name, email_addresses, image_url } = event.data;
            
            // Validate required data
            if (!email_addresses || !email_addresses[0]) {
                throw new Error('No email addresses found in user data');
            }
            
            const userData = {
                _id: id,
                email: email_addresses[0].email_address, // Fixed typo here
                name: `${first_name || ''} ${last_name || ''}`.trim(),
                imageUrl: image_url || null
            };
            
            await connectDB();
            const user = await User.create(userData);
            
            console.log('User created successfully:', user._id);
            return { success: true, userId: user._id };
            
        } catch (error) {
            console.error('Error creating user:', error);
            throw error; // Re-throw to let Inngest handle retries
        }
    }
);


// Inngest function to update user data in database
export const syncUserUpdation = inngest.createFunction(
    {
        id: 'update-user-from-clerk'
    },
    { event: 'clerk/user.updated' },
    async ({ event }) => {
        try {
            console.log('Processing user update:', event.data.id);
            
            const { id, first_name, last_name, email_addresses, image_url } = event.data;
            
            // Validate required data
            if (!email_addresses || !email_addresses[0]) {
                throw new Error('No email addresses found in user data');
            }
            
            const userData = {
                email: email_addresses[0].email_address, // Fixed typo here
                name: `${first_name || ''} ${last_name || ''}`.trim(),
                imageUrl: image_url || null
            };
            
            await connectDB();
            const updatedUser = await User.findByIdAndUpdate(
                id, 
                userData, 
                { new: true } // Return updated document
            );
            
            if (!updatedUser) {
                console.warn(`User with id ${id} not found for update`);
                return { success: false, message: 'User not found' };
            }
            
            console.log('User updated successfully:', updatedUser._id);
            return { success: true, userId: updatedUser._id };
            
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    }
);

// Inngest Function to delete user from database
export const syncUserDeletion = inngest.createFunction(
    {
        id: 'delete-user-with-clerk'
    },
    { event: 'clerk/user.deleted' },
    async ({ event }) => {
        try {
            console.log('Processing user deletion:', event.data.id);
            
            const { id } = event.data;
            
            if (!id) {
                throw new Error('User ID is required for deletion');
            }
            
            await connectDB();
            const deletedUser = await User.findByIdAndDelete(id);
            
            if (!deletedUser) {
                console.warn(`User with id ${id} not found for deletion`);
                return { success: false, message: 'User not found' };
            }
            
            console.log('User deleted successfully:', id);
            return { success: true, userId: id };
            
        } catch (error) {
            console.error('Error deleting user:', error);
            throw error;
        }
    }
);