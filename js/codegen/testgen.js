function testGenGenerate() {
    const type = document.getElementById('testType').value;
    const className = document.getElementById('testClass').value.trim();
    const methodName = document.getElementById('testMethod').value.trim();
    const out = document.getElementById('testOutput');

    if (!className) {
        out.textContent = '请输入类名';
        out.className = 'output-box error';
        return;
    }
    if (!methodName) {
        out.textContent = '请输入方法名';
        out.className = 'output-box error';
        return;
    }

    const simpleName = className.split('.').pop();
    const packageName = className.includes('.') ? className.substring(0, className.lastIndexOf('.')) : '';
    const testClass = simpleName + 'Test';
    const varName = simpleName.substring(0, 1).toLowerCase() + simpleName.substring(1);

    let code = '';
    if (packageName) {
        code += `package ${packageName};\n\n`;
    }

    code += `import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
`;

    if (type === 'controller') {
        code += `import org.springframework.test.web.servlet.MockMvc;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
`;
        code += `
@WebMvcTest(${simpleName}.class)
class ${testClass} {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ${simpleName}Service ${varName}Service;

    @Test
    void ${methodName}_shouldReturnOk() throws Exception {
        // given
        // when
        // then
        mockMvc.perform(get("/api/xxx"))
                .andExpect(status().isOk());
    }
}`;
    } else if (type === 'service') {
        code += `import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
`;
        code += `
@ExtendWith(MockitoExtension.class)
class ${testClass} {

    @InjectMocks
    private ${simpleName} ${varName};

    @Mock
    private ${simpleName}Mapper ${varName}Mapper;

    @Test
    void ${methodName}_shouldSuccess() {
        // given
        // when
        Object result = ${varName}.${methodName}();
        // then
        assertNotNull(result);
    }
}`;
    } else {
        code += `import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
`;
        code += `
@ExtendWith(MockitoExtension.class)
class ${testClass} {

    @InjectMocks
    private ${simpleName} ${varName};

    @Mock
    private ${simpleName}Mapper ${varName}Mapper;

    @Test
    void ${methodName}_shouldSuccess() {
        // given
        // when
        Object result = ${varName}.${methodName}();
        // then
        assertNotNull(result);
    }
}`;
    }

    out.textContent = code;
    out.className = 'output-box';
    setStatus('测试代码已生成');
}
