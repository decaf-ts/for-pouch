### How to Use

## Installation

First, install the package and its peer dependencies:

```bash
npm install @decaf-ts/for-pouch pouchdb @decaf-ts/core @decaf-ts/decorator-validation
```

## Basic Usage Examples

### Creating a Model

Define a model class that will be stored in PouchDB:

```typescript
import { Model } from "@decaf-ts/decorator-validation";
import { DBKeys, id } from "@decaf-ts/db-decorators";

class User extends Model {
  @id()
  id: string;
  
  firstName: string;
  lastName: string;
  email: string;
  
  constructor(data?: Partial<User>) {
    super();
    if (data) {
      Object.assign(this, data);
    }
  }
}
```

### Setting up the PouchAdapter

Initialize the PouchAdapter with your PouchDB instance:

```typescript
import PouchDB from 'pouchdb';
import { PouchAdapter } from '@decaf-ts/for-pouch';

// Create a PouchDB instance
const db = new PouchDB('my-database');

// Create a PouchAdapter instance
const adapter = new PouchAdapter('my-app', 'default');

// Connect the adapter to the database
adapter.connect(db);
```

### Creating a Repository

Create a repository for your model:

```typescript
import { PouchRepository } from '@decaf-ts/for-pouch';
import { Repository } from '@decaf-ts/core';

// Create a repository for the User model
const userRepository: PouchRepository<User> = Repository.create<User>(User, adapter);
```

### CRUD Operations

#### Creating a Record

```typescript
// Use case: Adding a new user to the database
const createUser = async () => {
  const newUser = new User({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com'
  });
  
  // The id will be generated automatically
  const createdUser = await userRepository.create(newUser);
  console.log('Created user:', createdUser);
};
```

#### Reading a Record

```typescript
// Use case: Retrieving a user by ID
const getUser = async (userId: string) => {
  try {
    const user = await userRepository.read(userId);
    console.log('Retrieved user:', user);
    return user;
  } catch (error) {
    if (error instanceof NotFoundError) {
      console.error('User not found');
    } else {
      console.error('Error retrieving user:', error);
    }
    throw error;
  }
};
```

#### Updating a Record

```typescript
// Use case: Updating user information
const updateUser = async (userId: string, updates: Partial<User>) => {
  try {
    // First, get the current user
    const user = await userRepository.read(userId);
    
    // Apply updates
    Object.assign(user, updates);
    
    // Save the updated user
    const updatedUser = await userRepository.update(user);
    console.log('Updated user:', updatedUser);
    return updatedUser;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};
```

#### Deleting a Record

```typescript
// Use case: Removing a user from the database
const deleteUser = async (userId: string) => {
  try {
    await userRepository.delete(userId);
    console.log('User deleted successfully');
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
};
```

### Bulk Operations

#### Creating Multiple Records

```typescript
// Use case: Adding multiple users at once
const createUsers = async (users: User[]) => {
  try {
    const createdUsers = await userRepository.createAll(users);
    console.log('Created users:', createdUsers);
    return createdUsers;
  } catch (error) {
    console.error('Error creating users:', error);
    throw error;
  }
};
```

#### Reading Multiple Records

```typescript
// Use case: Retrieving multiple users by their IDs
const getUsers = async (userIds: string[]) => {
  try {
    const users = await userRepository.readAll(userIds);
    console.log('Retrieved users:', users);
    return users;
  } catch (error) {
    console.error('Error retrieving users:', error);
    throw error;
  }
};
```

### Using PouchFlags

```typescript
// Use case: Providing a UUID for tracking operations
const createUserWithUUID = async () => {
  const newUser = new User({
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@example.com'
  });
  
  // Create with flags
  const flags: PouchFlags = {
    UUID: 'user-123-operation-456'
  };
  
  const createdUser = await userRepository.create(newUser, flags);
  console.log('Created user with UUID:', createdUser);
};
```

### Raw Queries

```typescript
// Use case: Executing a raw PouchDB query
const executeRawQuery = async () => {
  try {
    const result = await adapter.raw({
      selector: {
        email: { $regex: '^john' }
      },
      limit: 10
    });
    
    console.log('Query results:', result);
    return result;
  } catch (error) {
    console.error('Error executing query:', error);
    throw error;
  }
};
```

## Advanced Examples

### Creating Indexes

```typescript
// Use case: Creating indexes for efficient querying
const createIndexes = async () => {
  try {
    await adapter.index([User]);
    console.log('Indexes created successfully');
  } catch (error) {
    if (error instanceof IndexError) {
      console.error('Error creating index:', error.message);
    } else {
      console.error('Unexpected error:', error);
    }
    throw error;
  }
};
```

### Error Handling

```typescript
// Use case: Handling different types of errors
const handleErrors = async (userId: string) => {
  try {
    const user = await userRepository.read(userId);
    return user;
  } catch (error) {
    if (error instanceof NotFoundError) {
      console.error('User not found:', error.message);
      // Handle not found case
    } else if (error instanceof ConflictError) {
      console.error('Conflict detected:', error.message);
      // Handle conflict case
    } else if (error instanceof ConnectionError) {
      console.error('Connection issue:', error.message);
      // Handle connection issues
    } else {
      console.error('Unexpected error:', error);
      // Handle other errors
    }
    throw error;
  }
};
```

### Using the PouchFlavour Constant

```typescript
// Use case: Creating custom decorators for PouchDB
import { Decoration } from '@decaf-ts/decorator-validation';
import { PouchFlavour } from '@decaf-ts/for-pouch';

// Create a custom decorator that only applies to PouchDB implementations
const customPouchDecorator = () => {
  return (target: any, propertyKey: string) => {
    Decoration.flavouredAs(PouchFlavour)
      .for(propertyKey)
      .define(/* your custom metadata */)
      .apply();
  };
};

// Usage in a model
class CustomModel extends Model {
  @customPouchDecorator()
  specialField: string;
}
```

For more detailed information, refer to:
- [Initial Setup](./tutorials/For%20Developers.md#_initial-setup_)
- [Installation](./tutorials/For%20Developers.md#installation)
- [Scripts](./tutorials/For%20Developers.md#scripts)
- [Linting](./tutorials/For%20Developers.md#testing)
- [CI/CD](./tutorials/For%20Developers.md#continuous-integrationdeployment)
- [Publishing](./tutorials/For%20Developers.md#publishing)
- [Structure](./tutorials/For%20Developers.md#repository-structure)
- [IDE Integrations](./tutorials/For%20Developers.md#ide-integrations)
  - [VSCode(ium)](./tutorials/For%20Developers.md#visual-studio-code-vscode)
  - [WebStorm](./tutorials/For%20Developers.md#webstorm)
- [Considerations](./tutorials/For%20Developers.md#considerations)


