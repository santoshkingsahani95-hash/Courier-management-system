import { NextResponse } from "next/server";
import { getUsers, saveUser, deleteUser, addAuditLog, getUserByEmail } from "@/lib/store";
import { getCurrentUser, hashPassword } from "@/lib/auth";

export async function GET() {
  try {
    const users = await getUsers();
    const sanitized = users.map((u) => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }));
    return NextResponse.json({ users: sanitized });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (currentUser?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized. Admin role required." }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, password, role, status } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email and password are required" }, { status: 400 });
    }

    const existing = await getUserByEmail(email);
    if (existing) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 400 });
    }

    const passwordHash = hashPassword(password);
    const newUser = await saveUser({
      name,
      email,
      passwordHash,
      role: role || "staff",
      status: status || "active",
    });

    await addAuditLog({
      userId: currentUser._id,
      userName: currentUser.name,
      action: "CREATE_USER",
      entityType: "User",
      entityId: newUser._id,
      newValue: { name, email, role, status },
    });

    return NextResponse.json({
      success: true,
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        status: newUser.status,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (currentUser?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized. Admin role required." }, { status: 403 });
    }

    const body = await request.json();
    const { _id, name, email, password, role, status } = body;

    if (!_id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const updateData: any = { _id, email };
    if (name) updateData.name = name;
    if (role) updateData.role = role;
    if (status) updateData.status = status;
    if (password && password.trim().length > 0) {
      updateData.passwordHash = hashPassword(password);
    }

    const updated = await saveUser(updateData);

    await addAuditLog({
      userId: currentUser._id,
      userName: currentUser.name,
      action: "UPDATE_USER",
      entityType: "User",
      entityId: _id,
      newValue: { name, role, status },
    });

    return NextResponse.json({
      success: true,
      user: {
        _id: updated._id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        status: updated.status,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (currentUser?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized. Admin role required." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "User id is required" }, { status: 400 });
    }

    if (id === currentUser._id) {
      return NextResponse.json({ error: "Cannot delete your own admin account" }, { status: 400 });
    }

    await deleteUser(id);

    await addAuditLog({
      userId: currentUser._id,
      userName: currentUser.name,
      action: "DELETE_USER",
      entityType: "User",
      entityId: id,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

