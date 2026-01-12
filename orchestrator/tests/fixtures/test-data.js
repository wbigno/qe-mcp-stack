/**
 * Reusable test data fixtures
 */

export const sampleCodeFiles = {
  csharp: {
    service: `
public class UserService
{
    private readonly IUserRepository _repository;

    public UserService(IUserRepository repository)
    {
        _repository = repository;
    }

    public async Task<User> GetUserAsync(int id)
    {
        return await _repository.GetByIdAsync(id);
    }
}`,
    controller: `
[ApiController]
[Route("api/users")]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;

    [HttpGet("{id}")]
    public async Task<IActionResult> GetUser(int id)
    {
        var user = await _userService.GetUserAsync(id);
        return Ok(user);
    }
}`,
  },

  javascript: {
    function: `
function calculateTotal(items) {
    return items.reduce((sum, item) => sum + item.price, 0);
}`,
    class: `
class ShoppingCart {
    constructor() {
        this.items = [];
    }

    addItem(item) {
        this.items.push(item);
    }

    getTotal() {
        return this.items.reduce((sum, item) => sum + item.price, 0);
    }
}`,
  },
};

export const mcpHealthResponses = {
  healthy: { status: "healthy", version: "1.0.0", uptime: 12345 },
  unhealthy: { status: "unhealthy", error: "Connection timeout" },
};

export const adoWorkItems = [
  {
    id: 1234,
    fields: {
      "System.Title": "Test work item",
      "System.State": "Active",
      "System.WorkItemType": "User Story",
    },
  },
];
