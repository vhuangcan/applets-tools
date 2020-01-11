<template>
  <div class="applets">
    <h3 class="title">
      {{version === 1? '小程序代码上传' : '小程序代码提交审核'}}
    </h3>
    <transition-group tag="div" class="box" name="flip-list" mode="out-in">
      <div class="item" key="11">
        <fragment v-if="version === 1">
          <el-input
            placeholder="windows下请输入小程序cli的地址,一定要加上双引号"
            v-model="cli"
            clearable
            class="cli"
          />
        </fragment>
        <fragment v-else>
          <el-radio-group v-model="type">
            <el-radio :label="1">提交代码到审核</el-radio>
            <el-radio :label="2">审核通过代码提交上线</el-radio>
          </el-radio-group>
          <el-checkbox
            v-model="isBrowser"
            style="margin-left: 30px"
          >
            开启代码提交全过程(可选)
          </el-checkbox>
        </fragment>
      </div>
      <el-table
        @selection-change="handleSelectionChange"
        ref="table"
        key="table"
        :data="version === 1 ? file1 : file2"
      >
        <el-table-column
          fixed
          class-name="enterTo padLeft"
          type="selection"
          width="30"
        />
        <fragment v-if="version === 1">
          <el-table-column width="auto" label="全选">
            <template slot-scope="scope">
              <el-input
                clearable
                placeholder="小程序名称"
                v-model="scope.row.appletsName"
              />
            </template>
          </el-table-column>
          <el-table-column width="auto">
            <template slot-scope="scope">
              <div class="input">
                <input
                  class="visible"
                  :data-index="scope.$index"
                  type="file"
                  placeholder="文件夹地址"
                  webkitdirectory
                  directory
                />
                <el-input
                  @click.native="selectPath(scope.$index,scope.row)"
                  placeholder="文件夹地址"
                  v-model="scope.row.path"
                />
              </div>
            </template>
          </el-table-column>
          <el-table-column width="auto">
            <template slot-scope="scope">
              <el-input
                clearable
                placeholder="版本号"
                v-model="scope.row.version"
              />
            </template>
          </el-table-column>
          <el-table-column width="auto">
            <template slot-scope="scope">
              <el-input
                clearable
                placeholder="更新内容"
                v-model="scope.row.info"
              />
            </template>
          </el-table-column>
        </fragment>
        <fragment v-else>
          <el-table-column width="auto" label="全选" class-name="enterTo">
            <template slot-scope="scope">
              <el-input
                clearable
                placeholder="微信公众平台用户名"
                v-model="scope.row.user"
              />
            </template>
          </el-table-column>
          <el-table-column width="auto" class-name="enterTo">
            <template slot-scope="scope">
              <el-input
                clearable
                placeholder="微信公众平台密码"
                v-model="scope.row.pwd"
              />
            </template>
          </el-table-column>
        </fragment>
        <el-table-column width="73" class-name="enterTo">
          <template slot-scope="scope">
            <el-button
              type="danger"
              icon="el-icon-plus"
              round
              v-if="scope.$index===0"
              @click="add"
            />
            <el-button
              type="danger"
              icon="el-icon-minus"
              round v-if="scope.$index!==0"
              @click.prevent="del(scope.$index)"
            />
          </template>
        </el-table-column>
      </el-table>
      <div class="btn-wrap" key="btn">
        <el-button type="danger" :loading="upload" key="10" @click="uploadCode">提交代码</el-button>
        <el-button type="warning" key="12" @click="clearStore">清除记录</el-button>
      </div>
    </transition-group>
    <div class="tips">
      <p class="total">
        {{total}}
      </p>
      <p class="tips">
        {{tips}}
        <img
          :src="img"
          alt=""
          class="img"
          v-if="img"
        >
      </p>
      <p class="error" v-if="error">
        {{error}}
      </p>
    </div>
  </div>
</template>

<script>
import puppeteer from 'puppeteer-core'
import {remote, ipcRenderer} from 'electron'
import util from 'util'
import fs from 'fs'
import path from 'path'
import childProcess from 'child_process'

export default {
  name: "Applets",
  data() {
    return {
      multipleSelection1: [],
      multipleSelection2: [],
      file1: [],
      file2: [],
      upload: false,
      total: '',
      tips: '',
      error: '',
      type: 1,
      isBrowser: false,
      img: '',
      version: 1,
      cli: '',
    }
  },
  methods: {
    /**
     * 使用内置chrome浏览器
     * @returns {string}
     * @private
     */
    _getDefaultOsPath() {
      if (process.platform === "win32") {
        return 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
      } else {
        return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      }
    },
    /**
     * 全选
     * @param val
     */
    handleSelectionChange(val) {
      this[`multipleSelection${this.version}`] = val
    },
    /**
     * 清除记录
     */
    clearStore() {
      const clearArr = (arr) => {
        arr.forEach((obj) => {
          for (let key in obj) {
            obj[key] = ''
          }
        })
      }
      if (this.version === 1) {
        clearArr(this.multipleSelection1)
        localStorage.removeItem('file1')
        localStorage.removeItem('cli')
      } else {
        clearArr(this.multipleSelection2)
        localStorage.removeItem('file2')
      }
      this.clearStatus()
    },
    /**
     * 提交代码
     */
    uploadCode() {
      // 清空状态
      this.clearStatus()
      this.handleEmit().catch(err => {
        this.error = err
        this.upload = false
      })
    },
    /**
     * 处理操作流程
     * @returns {Promise<void>}
     */
    async handleEmit() {
      this.upload = true
      const version = this.version
      const selectItem = this[`multipleSelection${version}`]
      if (selectItem.length === 0) {
        this.$message({
          showClose: true,
          message: '请勾选需要执行的项~！🙂',
          type: 'error'
        })
        this.upload = false
        return
      }
      let timeStamp
      if (version === 1) {
        const exec = util.promisify(childProcess.exec)
        const cli = this.cli ? this.cli : '/Applications/wechatwebdevtools.app/Contents/MacOS/cli'
        const promise = async (cli) => await exec(cli)
        const automationUpload = async (obj, i) => {
          if (i === 1) {
            timeStamp = Date.now()
          }
          this.tips = `当前${obj.appletsName}小程序的代码正在上传`
          // 上传代码
          await promise(`${cli} -u ${obj.version}@${obj.path} --upload-desc ${obj.info}`)

          this.tips = `当前${obj.appletsName}小程序的代码已上传完毕`

          if (selectItem.length === i) {
            this.tips = `所有小程序的代码均已上传完毕~!
           一共花费的时间为${(Date.now() - timeStamp) / 1000}s`
            this.upload = false
            localStorage.setItem('cli', this.cli)
            localStorage.setItem(`file${this.version}`, JSON.stringify(selectItem))
          }
        }
        const sequence = () => {
          this.total = `一共需要上传小程序数量为${selectItem.length}`
          return selectItem.reduce(async (prev, next, i) => {
            await prev
            return automationUpload(next, i + 1)
          }, Promise.resolve())
        }
        return sequence()
      } else {
        const browser = await puppeteer.launch({
          // 内置浏览器
          executablePath: this._getDefaultOsPath(),
          // 设置超时时间
          timeout: 60000,
          //如果是访问https页面 此属性会忽略https错误
          ignoreHTTPSErrors: true,
          // 打开开发者工具, 当此值为true时, headless总为false
          devtools: false,
          // 关闭headless模式, 不会打开浏览器
          headless: !this.isBrowser,
          // slowMo: 40
        })
        // 打开一个新的标签页
        let page = await browser.newPage()
        // 指定进入微信登录模式
        const url = 'https://mp.weixin.qq.com'
        // 进入指定网址，networkidle0 参数将指定请求连接为0的时候才完成导航，也就是网页加载完毕。
        await page.goto(url, {waitUntil: 'networkidle0'})
        const automation = async (user, pwd, i) => {
          await page.type('input[name="account"]', user)
          await page.type('input[name="password"]', pwd)
          await page.click('.btn_login')
          if (!this.isBrowser) {
            // 此时将获取微信二维码
            await page.waitForSelector('.js_qrcode')
            await page.waitFor(1000)
            const imgEl = await page.$('.js_qrcode')
            timeStamp = Date.now()
            await imgEl.screenshot({
              path: path.resolve(__dirname, '..', '..', `./${timeStamp}.png`)
            })
            this.img = `file://${path.resolve(__dirname, '..', '..', `./${timeStamp}.png`)}`
            await page.waitForSelector('.js_wording') // 等待跳转后出现此class类
            const elTips = await page.$('.js_wording')
            this.tips = await elTips.evaluate(node => node.innerText)
          }
          await page.waitForSelector('#menuBar') // 等待扫码成功后，当前页面出现这个选择器后执行下一步。
          this.tips = '登录成功~！操作中...'
          await page.goto(`${url}/wxamp/wacodepage/getcodepage?${page.url().split('?')[1]}`, {waitUntil: 'networkidle0'})
          if (this.type === 2) {
            // 此时将代码提交上线
            await page.click('.user_status .weui-desktop-popover__wrp')
            const el = await page.$$('.col_main_inner .self-weui-modal .weui-desktop-btn_primary')
            await el[el.length - 2].click()
            await page.waitForSelector('.weui-desktop-qrcheck__img')
            await page.waitFor(1000)
            if (!this.isBrowser) {
              const imgEl = await page.$('.weui-desktop-qrcheck__img')
              fs.unlinkSync(path.resolve(__dirname, '..', '..', `./${timeStamp}.png`))
              timeStamp = Date.now()
              await imgEl.screenshot({
                path: path.resolve(__dirname, '..', '..', `./${timeStamp}.png`)
              })
              this.img = `file://${path.resolve(__dirname, '..', '..', `./${timeStamp}.png`)}`
              this.tips = '继续扫码确认发布代码~'
            }
            await page.waitForSelector('.empty_tips')
          } else if (this.type === 1) {
            // 此时将代码提交审核
            const el = await page.$$('.code_version_dev .code_version_log_ft')
            await el[el.length - 1].click()
            await page.waitFor(1000)
            await page.click('.weui-desktop-icon-checkbox')
            await page.click('.code_submit_dialog .weui-desktop-btn_primary')
            await page.click("[extclass='muti_msg_dialog'] .weui-desktop-btn_primary")
            await page.waitFor(2000)
            const pages = (await browser.pages())[2]
            const text = await pages.$('textarea')
            await text.evaluate(node => {
              node.value = ''
            })
            await pages.type('textarea', 'release update')
            await pages.click('.tool_bar')
            await pages.waitFor(1000)
            await pages.close()
          }
          await page.evaluate(() => {
            // 隐藏节点的click必须这么触发。page.click()无效
            document.querySelector('[data-msgid="退出"]').click()
          })
          // 等待当前账号退出后将新的页面实例重新赋予 page
          await page.waitForNavigation()
          page = (await browser.pages())[1]
          this.tips = `当前第${i}个小程序处理完成`
          if (!this.isBrowser) {
            fs.unlinkSync(path.resolve(__dirname, '..', '..', `./${timeStamp}.png`))
          }
          if (i === selectItem.length) {
            this.tips = `所有小程序均已处理完成`
            this.img = ''
            this.upload = false
            localStorage.setItem(`file${this.version}`, JSON.stringify(selectItem))
            // 关闭 headless chrome
            await browser.close()
          }
        }
        this.total = `一共有${selectItem.length}个小程序待处理`
        return selectItem.reduce(async (prev, next, i) => {
          await prev
          return automation(next.user, next.pwd, i + 1)
        }, Promise.resolve())
      }
    },
    /**
     * 删除
     * @param index
     */
    del(index) {
      const file = this[`file${this.version}`]
      const multipleSelection = this[`multipleSelection${this.version}`]
      file.splice(index, 1)
      multipleSelection.splice(index, 1)
    },
    /**
     * 添加
     */
    add() {
      if (this.version === 1) {
        this.file1.push({
          appletsName: '',
          path: '',
          version: '',
          info: '',
        })
      } else {
        this.file2.push({
          user: '',
          pwd: ''
        })
      }

    },
    /**
     * 弹出介绍
     */
    handleIntro() {
      this.$alert('<p>小程序代码上传： 能将本地多个小程序代码进行批量上传。</p>   ' +
          ' <p>小程序代码提交： 具有将上传后的代码进行批量提交审核和审核通过后的代码批量提交上线。</p>',
          '功能介绍', {
            dangerouslyUseHTMLString: true
          })
    },
    /**
     * 弹出使用教程
     */
    handleTutorial() {

    },
    /**
     * 切换工具版本
     */
    switchFun() {
      this.version = this.version === 1 ? 2 : 1
      this.clearStatus()
    },
    /**
     * 清空状态
     */
    clearStatus() {
      this.error = ''
      this.total = ''
      this.tips = ''
      this.img = ''
    },
    /**
     * 选择路径
     * @param index
     * @param row
     */
    selectPath(index, row) {
      const handleChange = () => {
        const {name, path} = el.files[0]
        row.appletsName = name
        row.path = path
        el.removeEventListener('change', handleChange)
        el.value = '' // 这个很重要。不然就会导致后续再次重复选取同样文件夹change事件不会被触发
      }
      const el = document.querySelector(`[data-index="${index}"]`)
      el.click()
      el.addEventListener('change', handleChange)
    }
  },
  mounted() {
    this.file1 = JSON.parse(localStorage.getItem('file1')) || [
      {
        appletsName: '',
        path: '',
        version: '',
        info: ''
      },
      {
        appletsName: '',
        path: '',
        version: '',
        info: ''
      },
      {
        appletsName: '',
        path: '',
        version: '',
        info: ''
      }
    ]
    this.file2 = JSON.parse(localStorage.getItem('file2')) || [
      {
        user: '',
        pwd: ''
      },
      {
        user: '',
        pwd: ''
      },
      {
        user: '',
        pwd: ''
      },
      {
        user: '',
        pwd: ''
      }
    ]
    ipcRenderer.on('message', (event, type) => {
      switch (type) {
        case 'updating':
          this.$notify({
            type: 'info',
            message: '更新中',
            duration: 0
          })
          break
        case 'downloaded':
          this.$notify({
            type: 'success',
            message: '更新完成~即将重启'
          })
          break
        case 'switch':
          this.switchFun()
          break
        case 'intro':
          this.handleIntro()
          break
        case 'tutorial':
          this.handleTutorial()
          break
      }
    })
    const {Menu} = remote
    const createContextMenu = () => {
      const contextTemplate = [
        {
          label: "切换功能",
          click: () => {
            this.switchFun()
          }
        },
        {
          label: "查看教程",
          click: () => {
            this.handleIntro()
          }
        },
        {
          label: "功能介绍",
          click: () => {
            this.handleTutorial()
          }
        },
      ]
      return Menu.buildFromTemplate(contextTemplate)
    }
    window.addEventListener('contextmenu', (event) => {
      event.preventDefault()
      const contextMenu = createContextMenu()
      contextMenu.popup({
        window: remote.getCurrentWindow()
      })
    }, false)
  }
}
</script>

<style lang="scss">
.applets {
  text-align: center;
  position: relative;
  margin: 0 auto;
  width: 90%;

  .title {
    font-size: 18px;
    padding: 20px 0;
    text-align: center;
  }

  .box {
    width: 100%;

    .el-input {
      width: 100%;
    }

    .cli {
      width: 100%;
    }
  }

  .el-table {
    background: transparent;

    th, tr, td {
      background: transparent;
      border-bottom: 0 !important;
    }

    .hover-row {
      td {
        background: transparent !important;
      }
    }

    &:before {
      height: 0;
    }

  }

  .padLeft {
    .cell {
      padding-left: 3px;
    }
  }

  .el-checkbox__inner {
    transform: scale(1.3);
  }

  .item {
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .tips {
    padding: 10px 0 20px 0;
  }

  .status, .error {
    margin: 0 auto;
    text-align: left;
  }

  .img {
    display: block;
    width: 220px;
    height: 220px;
    margin: 20px auto 0;
  }

  .btn-wrap {
    margin-top: 30px;
  }

  .input {
    position: relative;

    .visible {
      opacity: 0;
      position: absolute;
      top: 0;
      width: 100%;
      height: 100%;
    }
  }

}
</style>
