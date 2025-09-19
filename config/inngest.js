import { Inngest } from "inngest";
import connectDB from "./db";
import User from "@/models/User";
import { stepsSchemas } from "inngest/api/schema";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "quicckcart-next" });

// Inngest funtion to save user data to a database
export const syncUserCreation = inngest.createFunction(
    {
        id: 'update-user-from-clerk'
    },
    { event: 'clerk/user.updated' },
    async ({ event, step }) => {
        try {
            console.log('User update event:', event.data);

            const { id, first_name, last_name, email_addresses, image_url } = event.data;

            if (!id) {
                throw new Error('Missing user ID');
            }

            // Step 1: Connect to database
            await step.run("connect-db", async () => {
                await connectDB();
                return "Connected to database";
            });

            // Step 2: Update user data
            const result = await step.run("update-user", async () => {
                const userData = {
                    email: email_addresses?.[0]?.email_address || email_addresses?.[0],
                    name: `${first_name || ''} ${last_name || ''}`.trim(),
                    imageUrl: image_url || null
                };

                console.log('Updating user with data:', userData);

                const updatedUser = await User.findByIdAndUpdate(
                    id, 
                    userData, 
                    { new: true, runValidators: true }
                );

                if (!updatedUser) {
                    throw new Error(`User with ID ${id} not found`);
                }

                return updatedUser;
            });

            console.log('User updated successfully:', result._id);
            return { success: true, userId: result._id };

        } catch (error) {
            console.error('Error in syncUserUpdation:', error);
            throw error;
        }
    }
);

// Inngeest Function to update user data in database
export const syncUserUpdation = inngest.createFunction(
    {
        id: 'update-user-from-clerk'
    },
    { event: 'clerk/user.updated'},
    async ({event}) => {
        const { id, first_name, last_name, email_addresses, image_url } = event.data
        const userData = {
            _id:id,
            email: email_addresses[0].email.email_address,
            name: first_name + ' ' + last_name,
            imageUrl:image_url
    
        }
        await connectDB()
        await User.findByIdAndUpdate(id,userData)
    }
)

//Inngest function to delete user from database
export const syncUserDeletion = inngest.createFunction(
    {
        id: 'delete-user-with-clerk'
    },
    { event: 'clerk/user.deleted' },
    async ({ event, step }) => {
        try {
            console.log('User deletion event:', event.data);

            const { id } = event.data;

            if (!id) {
                throw new Error('Missing user ID for deletion');
            }

            // Step 1: Connect to database
            await step.run("connect-db", async () => {
                await connectDB();
                return "Connected to database";
            });

            // Step 2: Delete user
            const result = await step.run("delete-user", async () => {
                console.log('Deleting user with ID:', id);

                const deletedUser = await User.findByIdAndDelete(id);

                if (!deletedUser) {
                    console.warn(`User with ID ${id} not found for deletion`);
                    return { found: false, id };
                }

                return { found: true, id: deletedUser._id };
            });

            console.log('User deletion completed:', result);
            return { success: true, deleted: result.found, userId: result.id };

        } catch (error) {
            console.error('Error in syncUserDeletion:', error);
            throw error;
        }
    }
);